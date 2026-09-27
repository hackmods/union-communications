import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditDbBackend } from "@/lib/db/backend";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import {
  subprocessorAuditEvents,
  subprocessorPublicProjections,
  subprocessorRegistry,
} from "@/lib/db/schema";
import { authorizeSubprocessorAdmin } from "@/lib/site-admin/subprocessor-http";
import {
  isSubprocessorPublishable,
  toSubprocessorPublicProjection,
} from "@/lib/site-admin/subprocessor-registry";

type RouteContext = { params: Promise<{ id: string }> };

const publishSchema = z.object({
  published: z.boolean(),
  mfaCode: z.string().max(32).optional(),
}).strict();

function snapshot(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

/** POST /api/site-admin/subprocessors/[id]/publish — publish or withdraw approved public fields. */
export async function POST(request: Request, context: RouteContext) {
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200, extra?: HeadersInit) => {
    const headers = new Headers(extra);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };

  const access = await authorizeSubprocessorAdmin();
  if (!access.ok) {
    const headers = new Headers(access.response.headers);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    return new Response(access.response.body, {
      status: access.response.status,
      statusText: access.response.statusText,
      headers: correlation.responseHeaders(headers),
    });
  }
  if (isHostedCustomerMode() && auditDbBackend() !== "postgres") {
    return respond(
      {
        error: "Publication is unavailable until durable audit storage is configured.",
        code: "audit_unavailable",
      },
      503,
    );
  }

  const { id } = await context.params;
  if (!id) return respond({ error: "Missing provider id." }, 400);

  const raw = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(raw);
  if (!parsed.success) {
    return respond({ error: "Choose whether to publish this provider and try again." }, 400);
  }

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) => auditLog.log({
    userId: access.actorId,
    action: "site_admin.subprocessor.publish",
    resourceType: "site_admin",
    resourceId: id,
    outcome,
    requestId: correlation.requestId,
    metadata,
  });

  const challenge = await verifyFreshMfaStepUp({
    userId: access.actorId,
    code: parsed.data.mfaCode,
  });
  if (!challenge.ok) {
    try {
      await recordOutcome(challenge.outcome, {
        phase: "step_up",
        reason: `mfa_step_up_${challenge.code}`,
        published: String(parsed.data.published),
      });
    } catch {
      return respond({ error: "Audit service unavailable.", code: "audit_unavailable" }, 503);
    }
    const headers = new Headers();
    if (challenge.retryAfterSeconds) {
      headers.set("Retry-After", String(challenge.retryAfterSeconds));
    }
    return respond(
      {
        error: "A fresh MFA challenge is required before changing public subprocessor information.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  try {
    try {
      await recordOutcome("success", {
        phase: "publication_authorized",
        published: String(parsed.data.published),
      });
    } catch {
      return respond(
        {
          error: "Publication was not changed because its access event could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const result = await withRlsContext(access.rlsContext, async () => {
      const db = getDb();
      const [record] = await db
        .select()
        .from(subprocessorRegistry)
        .where(eq(subprocessorRegistry.id, id))
        .limit(1)
        .for("update");
      if (!record) return { kind: "not_found" as const };
      if (parsed.data.published && !isSubprocessorPublishable(record)) {
        return { kind: "not_publishable" as const };
      }

      const [priorProjection] = await db
        .select()
        .from(subprocessorPublicProjections)
        .where(eq(subprocessorPublicProjections.id, id))
        .limit(1)
        .for("update");
      const publishedAt = new Date();
      const nextProjection = parsed.data.published
        ? toSubprocessorPublicProjection(record, publishedAt)
        : null;

      await db.delete(subprocessorPublicProjections)
        .where(eq(subprocessorPublicProjections.id, id));
      if (nextProjection) {
        await db.insert(subprocessorPublicProjections).values(nextProjection);
      }
      await db.insert(subprocessorAuditEvents).values({
        id: crypto.randomUUID(),
        actorId: access.actorId,
        providerId: id,
        action: parsed.data.published ? "published" : "withdrawn",
        beforeRecord: snapshot(priorProjection),
        afterRecord: snapshot(nextProjection),
      });
      return { kind: "updated" as const };
    });

    if (result.kind !== "updated") {
      const reason = result.kind === "not_found" ? "provider_not_found" : "provider_not_publishable";
      try {
        await recordOutcome("denied", { phase: "publication_result", reason });
      } catch {
        return respond({ error: "Audit service unavailable.", code: "audit_unavailable" }, 503);
      }
      return result.kind === "not_found"
        ? respond({ error: "Provider record not found." }, 404)
        : respond({ error: "This provider is not approved for public disclosure." }, 409);
    }

    try {
      await recordOutcome("success", {
        phase: "publication_result",
        published: String(parsed.data.published),
      });
    } catch {
      return respond(
        {
          error: "The publication may have changed, but its result audit could not be confirmed. Reload the register before trying again.",
          code: "subprocessor_publish_result_unconfirmed",
        },
        503,
      );
    }
    return respond({ ok: true, published: parsed.data.published });
  } catch {
    await recordOutcome("error", {
      phase: "publication_result",
      reason: "publication_outcome_unconfirmed",
      published: String(parsed.data.published),
    }).catch(() => undefined);
    return respond(
      {
        error: "The publication outcome could not be confirmed. Reload the register before trying again.",
        code: "subprocessor_publish_outcome_unconfirmed",
      },
      503,
    );
  }
}
