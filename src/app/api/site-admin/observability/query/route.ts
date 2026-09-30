import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { withRlsContext } from "@/lib/db/rls-context";
import { isPostgresConfigured } from "@/lib/db/client";
import {
  isObservabilityAlertsEnabled,
  isObservabilityAutoAckOnDeploy,
  defaultObservabilityAlertEmail,
} from "@/lib/observability/alert-rules";
import { alertsBackend } from "@/lib/observability/alert-store";
import { acksBackend, listObservabilityAcks } from "@/lib/observability/acks";
import { observabilityStore } from "@/lib/observability/store";
import { buildObservabilityHealth } from "@/lib/observability/config";
import { resolveSincePreset } from "@/lib/observability/summarize";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    limit: z.number().int().min(1).max(500).optional(),
    since: z.string().max(40).optional(),
    level: z.enum(["error", "warn", "info"]).optional(),
    signal: z.string().max(80).optional(),
    source: z.enum(["server", "client", "cron", "edge"]).optional(),
    routePrefix: z.string().max(200).optional(),
    q: z.string().max(200).optional(),
    fingerprint: z.string().max(64).optional(),
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

function storeDisabledMessage(backend: string): string {
  if (backend === "postgres" || backend === "noop") {
    return "Observability store is disabled. Set DATABASE_URL (Postgres) or OBSERVABILITY_BACKEND=postgres after migrate, or enable ERROR_LOG_FILE_* as a file fallback.";
  }
  return "Error log store is disabled. Enable ERROR_LOG_FILE_ENABLED and ERROR_LOG_FILE_PATH, or use Postgres via DATABASE_URL.";
}

/** POST /api/site-admin/observability/query — MFA-gated issues + events. */
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

  if (!observabilityStore.isEnabled()) {
    return respond(
      {
        error: storeDisabledMessage(health.backend),
        code: "observability_store_disabled",
        health,
      },
      503,
    );
  }

  const {
    mfaCode,
    limit,
    since,
    level,
    signal,
    source,
    routePrefix,
    q,
    fingerprint,
  } = parsed.data;
  const sinceIso = resolveSincePreset(since);

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
        backend: health.backend,
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

    const filters = {
      limit: limit ?? 50,
      since: sinceIso,
      level,
      signal,
      source,
      routePrefix,
      q,
      fingerprint,
    };

    const run = async () => {
      const [events, summary, storeStats, acks] = await Promise.all([
        observabilityStore.query(filters),
        observabilityStore.summarize({ ...filters, limit: 500 }),
        observabilityStore.stats(),
        acksBackend() === "none"
          ? Promise.resolve([])
          : listObservabilityAcks(),
      ]);
      return { events, summary, storeStats, issues: summary.byFingerprint, acks };
    };

    const payload =
      health.backend === "postgres"
        ? await withRlsContext(
            {
              userId: gate.session.user.id,
              platformAdmin: true,
              mfaVerified: true,
            },
            run,
          )
        : await run();

    try {
      await recordOutcome("success", {
        phase: "query_result",
        count: String(payload.events.length),
        issueCount: String(payload.issues.length),
        backend: health.backend,
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

    return respond({
      ...payload,
      health,
      alerts: {
        backend: alertsBackend(),
        acksBackend: acksBackend(),
        postgresRequired: alertsBackend() === "none",
        enabled: isObservabilityAlertsEnabled(),
        autoAckOnDeploy: isObservabilityAutoAckOnDeploy(),
        defaultRecipientConfigured: Boolean(defaultObservabilityAlertEmail()),
      },
    });
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
