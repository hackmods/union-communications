import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { isPostgresConfigured, getDb } from "@/lib/db/client";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { resolveMfaMode, verifyMfaCode } from "@/lib/auth/mfa-policy";
import type { IncidentStepUpAction } from "@/lib/db/schema/incidents";
import { platformIncidentAuditEvents, platformIncidentStepUpGrants } from "@/lib/db/schema";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";

export function noStoreJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return Response.json(data, { ...init, headers });
}

export type IncidentAdminAccess = {
  actorId: string;
  rlsContext: RlsSessionContext;
};

export async function authorizeIncidentAdmin(): Promise<
  | { ok: true; access: IncidentAdminAccess }
  | { ok: false; response: Response }
> {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return { ok: false, response: noStoreJson({ error: gate.error }, { status: gate.status }) };
  }
  if (!isPostgresConfigured() || process.env.AUTH_USERS_BACKEND?.trim().toLowerCase() !== "postgres") {
    return {
      ok: false,
      response: noStoreJson({ error: "The incident register requires durable PostgreSQL-backed accounts and storage." }, { status: 503 }),
    };
  }
  if (resolveMfaMode() !== "totp") {
    return {
      ok: false,
      response: noStoreJson({ error: "Incident access requires per-user TOTP to be configured on this host." }, { status: 503 }),
    };
  }
  return {
    ok: true,
    access: {
      actorId: gate.session.user.id,
      rlsContext: { userId: gate.session.user.id, mfaVerified: true },
    },
  };
}

export function requestId(): string {
  return randomUUID();
}

function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueIncidentStepUp(input: {
  actorId: string;
  code: string;
  action: IncidentStepUpAction;
  resourceId?: string;
  requestId: string;
}): Promise<{ ok: true; token: string } | { ok: false; response: Response }> {
  const now = new Date();
  return withRlsContext({ userId: input.actorId, mfaVerified: true }, async () => {
    const db = getDb();
    // Serialize per-actor attempts before counting failures so parallel guesses cannot race the threshold.
    await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`incident-step-up:${input.actorId}`}, 0))`);
    const cutoff = new Date(now.getTime() - 15 * 60 * 1000);
    const [recent] = await db
      .select({ total: count() })
      .from(platformIncidentAuditEvents)
      .where(and(
        eq(platformIncidentAuditEvents.actorId, input.actorId),
        eq(platformIncidentAuditEvents.action, "step_up_failed"),
        gt(platformIncidentAuditEvents.createdAt, cutoff),
      ));
    if ((recent?.total ?? 0) >= 5) {
      return { ok: false as const, response: noStoreJson({ error: "Too many failed verification attempts. Try again in 15 minutes." }, { status: 429 }) };
    }

    const verification = await verifyMfaCode({ userId: input.actorId, code: input.code });
    if (verification.ok && verification.mode !== "totp") {
      return { ok: false as const, response: noStoreJson({ error: "Per-user TOTP verification is unavailable." }, { status: 503 }) };
    }
    if (!verification.ok) {
      if (verification.status === 503) {
        return { ok: false as const, response: noStoreJson({ error: "Per-user TOTP verification is unavailable." }, { status: 503 }) };
      }
      if (verification.status === 429) {
        return {
          ok: false as const,
          response: noStoreJson(
            { error: "Too many verification attempts. Try again after the limit resets." },
            {
              status: 429,
              headers: { "Retry-After": String(verification.retryAfterSeconds ?? 900) },
            },
          ),
        };
      }
      await db.insert(platformIncidentAuditEvents).values({
        id: randomUUID(),
        actorId: input.actorId,
        incidentId: input.resourceId ?? null,
        requestId: input.requestId,
        action: "step_up_failed",
        outcome: "denied",
      });
      return { ok: false as const, response: noStoreJson({ error: "The verification code was not accepted." }, { status: 400 }) };
    }

    const token = randomBytes(32).toString("base64url");
    await db.insert(platformIncidentStepUpGrants).values({
      id: randomUUID(),
      actorId: input.actorId,
      tokenHash: tokenDigest(token),
      action: input.action,
      resourceId: input.resourceId ?? "",
      expiresAt: new Date(now.getTime() + 60_000),
    });
    return { ok: true as const, token };
  });
}

/** Consume the opaque action-bound grant once; a failed attempt is metadata-audited. */
export async function consumeIncidentStepUp(input: {
  access: IncidentAdminAccess;
  token: string | null;
  action: IncidentStepUpAction;
  resourceId?: string;
  requestId: string;
}): Promise<boolean> {
  const now = new Date();
  const resourceId = input.resourceId ?? "";
  const token = input.token && input.token.length <= 128 ? input.token : "";
  return withRlsContext(input.access.rlsContext, async () => {
    const db = getDb();
    const match = and(
      eq(platformIncidentStepUpGrants.actorId, input.access.actorId),
      eq(platformIncidentStepUpGrants.tokenHash, tokenDigest(token)),
      eq(platformIncidentStepUpGrants.action, input.action),
      eq(platformIncidentStepUpGrants.resourceId, resourceId),
      gt(platformIncidentStepUpGrants.expiresAt, now),
      isNull(platformIncidentStepUpGrants.consumedAt),
    );
    const [grant] = await db
      .update(platformIncidentStepUpGrants)
      .set({ consumedAt: now })
      .where(match)
      .returning({ id: platformIncidentStepUpGrants.id });
    if (!grant) {
      await db.insert(platformIncidentAuditEvents).values({
        id: randomUUID(),
        actorId: input.access.actorId,
        incidentId: input.resourceId ?? null,
        requestId: input.requestId,
        action: "access_denied",
        outcome: "denied",
      });
      return false;
    }
    return true;
  });
}

export async function recordIncidentAction(input: {
  access: IncidentAdminAccess;
  requestId: string;
  incidentId?: string;
  action: "viewed" | "created" | "updated" | "closed" | "reopened" | "exported";
}): Promise<typeof platformIncidentAuditEvents.$inferSelect> {
  const db = getDb();
  const [event] = await db.insert(platformIncidentAuditEvents).values({
    id: randomUUID(),
    actorId: input.access.actorId,
    incidentId: input.incidentId ?? null,
    requestId: input.requestId,
    action: input.action,
    outcome: "success",
  }).returning();
  return event;
}
