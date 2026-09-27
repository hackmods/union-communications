import { and, desc, eq, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { auditLog } from "@/lib/audit/store";
import type { AuditEntry } from "@/lib/audit/adapter";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditDbBackend } from "@/lib/db/backend";
import { getDb } from "@/lib/db/client";
import { auditLog as auditLogTable } from "@/lib/db/schema";
import {
  getOwnerDb,
  isOwnerDbConfigured,
} from "@/lib/db/owner-client";

const requestSchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Cross-tenant site_admin audit rows. Uses owner DB when available so RLS
 * does not hide rows that carry a foreign union_id.
 */
async function querySiteAdminAudit(limit: number): Promise<AuditEntry[]> {
  if (auditDbBackend() !== "postgres") {
    return auditLog.query({ resourceType: "site_admin", limit });
  }

  const db = isOwnerDbConfigured() ? getOwnerDb() : getDb();
  const conditions: SQL[] = [eq(auditLogTable.resourceType, "site_admin")];
  const rows = await db
    .select()
    .from(auditLogTable)
    .where(and(...conditions))
    .orderBy(desc(auditLogTable.timestamp))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    unionId: row.unionId ?? undefined,
    localId: row.localId ?? undefined,
    metadata: row.metadata ?? undefined,
    outcome: row.outcome,
    requestId: row.requestId ?? undefined,
    timestamp: toIso(row.timestamp),
  }));
}

function responseContext() {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200, extra?: HeadersInit) => {
    const headers = new Headers(extra);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };
  return { correlation, respond };
}

/** POST /api/site-admin/audit — fresh-MFA access to cross-tenant operator logs. */
export async function POST(request: Request) {
  const { correlation, respond } = responseContext();
  const gate = await requireSiteAdminSession();
  if (!gate.ok) return respond({ error: gate.error }, gate.status);

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return respond({ error: "Invalid audit request" }, 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return respond({ error: "Invalid audit request" }, 400);
  }
  const limit = parsed.data.limit ?? 100;

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.audit.list",
      resourceType: "site_admin",
      resourceId: "*",
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  const challenge = await verifyFreshMfaStepUp({
    userId: gate.session.user.id,
    code: parsed.data.mfaCode,
  });
  if (!challenge.ok) {
    try {
      await recordOutcome(challenge.outcome, {
        phase: "access_challenge",
        reason: `mfa_step_up_${challenge.code}`,
      });
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        503,
      );
    }
    const headers = new Headers();
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    return respond(
      {
        error: "Fresh MFA is required before viewing the Site Admin audit log.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  try {
    const ownerRead =
      isOwnerDbConfigured() && auditDbBackend() === "postgres";
    try {
      await recordOutcome("success", {
        phase: "read_authorized",
        limit: String(limit),
        ownerRead: ownerRead ? "true" : "false",
      });
    } catch {
      return respond(
        {
          error: "The audit log was not read because its access event could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const entries = await querySiteAdminAudit(limit);
    try {
      await recordOutcome("success", {
        phase: "read_result",
        limit: String(limit),
        count: String(entries.length),
        ownerRead: ownerRead ? "true" : "false",
      });
    } catch {
      return respond(
        {
          error: "Audit results could not be returned because their access evidence is unavailable.",
          code: "audit_read_result_unconfirmed",
        },
        503,
      );
    }

    return respond({ entries });
  } catch {
    await recordOutcome("error", {
      phase: "read_result",
      reason: "audit_log_query_failed",
    }).catch(() => undefined);
    return respond({ error: "Could not load the Site Admin audit log." }, 503);
  }
}

/** Retire the query-string GET path so a challenge code can never enter a URL. */
export async function GET() {
  const { respond } = responseContext();
  return respond({ error: "Use POST to access the Site Admin audit log." }, 405, {
    Allow: "POST",
  });
}
