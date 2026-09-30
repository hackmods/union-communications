import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { observabilityStore } from "@/lib/observability/store";
import {
  buildObservabilityHealth,
  resolveObservabilityConfig,
} from "@/lib/observability/config";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
    since: z.string().max(40).optional(),
    level: z.enum(["error", "warn", "info"]).optional(),
    signal: z.string().max(80).optional(),
    source: z.enum(["server", "client", "cron", "edge"]).optional(),
    routePrefix: z.string().max(200).optional(),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

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

/** POST /api/site-admin/observability/query — MFA-gated recent event preview. */
export async function POST(request: Request) {
  const { correlation, respond } = responseContext();
  const gate = await requireSiteAdminSession();
  if (!gate.ok) return respond({ error: gate.error }, gate.status);

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return respond({ error: "Invalid query request" }, 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return respond({ error: "Invalid query request" }, 400);
  }

  const health = buildObservabilityHealth();
  const cfg = resolveObservabilityConfig();

  if (!observabilityStore.isEnabled() || !cfg.errorLogFileEnabled) {
    return respond(
      {
        error:
          "Error log store is disabled. Enable ERROR_LOG_FILE_ENABLED and ERROR_LOG_FILE_PATH on the host.",
        code: "observability_store_disabled",
        health,
      },
      503,
    );
  }

  const { mfaCode, limit, since, level, signal, source, routePrefix } =
    parsed.data;

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.observability.query",
      resourceType: "site_admin",
      resourceId: "*",
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  const challenge = await verifyFreshMfaStepUp({
    userId: gate.session.user.id,
    code: mfaCode,
  });
  if (!challenge.ok) {
    try {
      await recordOutcome(challenge.outcome, {
        phase: "query_challenge",
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
        error: "Fresh MFA is required before viewing operator error logs.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  try {
    try {
      await recordOutcome("success", {
        phase: "query_authorized",
        limit: String(limit ?? 50),
      });
    } catch {
      return respond(
        {
          error:
            "The query was not started because its access event could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const events = await observabilityStore.query({
      limit: limit ?? 50,
      since,
      level,
      signal,
      source,
      routePrefix,
    });

    try {
      await recordOutcome("success", {
        phase: "query_result",
        count: String(events.length),
      });
    } catch {
      return respond(
        {
          error:
            "Query results could not be returned because their access evidence is unavailable.",
          code: "query_result_unconfirmed",
        },
        503,
      );
    }

    return respond({ events, health });
  } catch {
    await recordOutcome("error", {
      phase: "query_result",
      reason: "observability_query_failed",
    }).catch(() => undefined);
    return respond({ error: "Could not load operator error logs." }, 503);
  }
}

export async function GET() {
  const { respond } = responseContext();
  return respond(
    { error: "Use POST to query operator error logs." },
    405,
    { Allow: "POST" },
  );
}
