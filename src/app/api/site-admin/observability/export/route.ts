import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { withRlsContext } from "@/lib/db/rls-context";
import { observabilityStore } from "@/lib/observability/store";
import { buildObservabilityHealth } from "@/lib/observability/config";
import { resolveSincePreset } from "@/lib/observability/summarize";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    format: z.enum(["jsonl", "csv", "incident-pack"]),
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

/** POST /api/site-admin/observability/export — MFA-gated CSV/JSONL/incident-pack. */
export async function POST(request: Request) {
  const { correlation, respond } = responseContext();
  const gate = await requireSiteAdminSession();
  if (!gate.ok) return respond({ error: gate.error }, gate.status);

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return respond({ error: "Invalid export request" }, 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return respond({ error: "Invalid export request" }, 400);
  }

  const health = buildObservabilityHealth();
  if (!observabilityStore.isEnabled()) {
    return respond(
      {
        error:
          "Observability store is disabled. Prefer DATABASE_URL + migrate (Postgres), or ERROR_LOG_FILE_* with a CapRover persistent volume.",
        code: "observability_store_disabled",
      },
      503,
    );
  }

  const {
    format,
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
      action: "site_admin.observability.export",
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
        phase: "export_challenge",
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
        error: "Fresh MFA is required before exporting operator error logs.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      headers,
    );
  }

  try {
    try {
      await recordOutcome("success", {
        phase: "export_authorized",
        format,
        limit: String(limit ?? 100),
        backend: health.backend,
      });
    } catch {
      return respond(
        {
          error:
            "The export was not started because its access event could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }

    const filters = {
      limit: limit ?? 100,
      since: sinceIso,
      level,
      signal,
      source,
      routePrefix,
      q,
      fingerprint,
    };

    const result =
      health.backend === "postgres"
        ? await withRlsContext(
            {
              userId: gate.session.user.id,
              platformAdmin: true,
              mfaVerified: true,
            },
            () => observabilityStore.export(filters, format),
          )
        : await observabilityStore.export(filters, format);

    try {
      await recordOutcome("success", {
        phase: "export_result",
        format,
        count: String(result.eventCount),
        backend: health.backend,
      });
    } catch {
      return respond(
        {
          error:
            "The export was not delivered because its audit record could not be confirmed.",
          code: "export_audit_unavailable",
        },
        503,
      );
    }

    const headers = new Headers({
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
    });
    correlation.responseHeaders(headers);
    const body =
      typeof result.body === "string"
        ? result.body
        : new Uint8Array(result.body);
    return new NextResponse(body, { status: 200, headers });
  } catch {
    await recordOutcome("error", {
      phase: "export_result",
      reason: "observability_export_failed",
    }).catch(() => undefined);
    return respond({ error: "Could not export operator error logs." }, 503);
  }
}

export async function GET() {
  const { respond } = responseContext();
  return respond(
    { error: "Use POST to export operator error logs." },
    405,
    { Allow: "POST" },
  );
}
