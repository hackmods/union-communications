import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { withRlsContext } from "@/lib/db/rls-context";
import { isPostgresConfigured } from "@/lib/db/client";
import { defaultObservabilityAlertEmail } from "@/lib/observability/alert-rules";
import {
  alertsBackend,
  createObservabilityAlertRule,
  deleteObservabilityAlertRule,
  listObservabilityAlertRules,
  updateObservabilityAlertRule,
} from "@/lib/observability/alert-store";

export const runtime = "nodejs";

const emailSchema = z.string().email().max(254);
const sourcesSchema = z
  .array(z.enum(["server", "client", "cron", "edge"]))
  .min(1)
  .max(4)
  .nullable()
  .optional();
const recipientsByUnionSchema = z
  .record(z.string().min(1).max(80), z.array(emailSchema).min(1).max(20))
  .nullable()
  .optional();

const listSchema = z
  .object({
    action: z.literal("list"),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

const createSchema = z
  .object({
    action: z.literal("create"),
    name: z.string().trim().min(1).max(120),
    enabled: z.boolean().optional(),
    minLevel: z.enum(["error", "warn", "info"]).optional(),
    sources: sourcesSchema,
    fingerprint: z.string().min(8).max(64).nullable().optional(),
    unionId: z.string().min(1).max(80).nullable().optional(),
    thresholdCount: z.number().int().min(1).max(10000).optional(),
    windowMinutes: z.number().int().min(1).max(10080).optional(),
    cooldownMinutes: z.number().int().min(1).max(10080).optional(),
    recipients: z.array(emailSchema).min(1).max(20).optional(),
    recipientsByUnion: recipientsByUnionSchema,
    emailFormat: z.enum(["multipart", "plain"]).optional(),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

const updateSchema = z
  .object({
    action: z.literal("update"),
    id: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(120).optional(),
    enabled: z.boolean().optional(),
    minLevel: z.enum(["error", "warn", "info"]).optional(),
    sources: sourcesSchema,
    fingerprint: z.string().min(8).max(64).nullable().optional(),
    unionId: z.string().min(1).max(80).nullable().optional(),
    thresholdCount: z.number().int().min(1).max(10000).optional(),
    windowMinutes: z.number().int().min(1).max(10080).optional(),
    cooldownMinutes: z.number().int().min(1).max(10080).optional(),
    recipients: z.array(emailSchema).min(1).max(20).optional(),
    recipientsByUnion: recipientsByUnionSchema,
    emailFormat: z.enum(["multipart", "plain"]).optional(),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

const deleteSchema = z
  .object({
    action: z.literal("delete"),
    id: z.string().min(1).max(80),
    mfaCode: z.string().max(32).optional(),
  })
  .strict();

const requestSchema = z.discriminatedUnion("action", [
  listSchema,
  createSchema,
  updateSchema,
  deleteSchema,
]);

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

function resolveRecipients(
  provided: string[] | undefined,
): string[] | { error: string; code: string } {
  if (provided && provided.length > 0) return provided;
  const fallback = defaultObservabilityAlertEmail();
  if (fallback) return [fallback];
  return {
    error:
      "Add at least one recipient email, or set OBSERVABILITY_ALERT_EMAIL.",
    code: "alert_recipients_required",
  };
}

/** POST /api/site-admin/observability/alert-rules — MFA-gated CRUD. */
export async function POST(request: Request) {
  const { correlation, respond } = responseContext();
  const gate = await requireSiteAdminSession();
  if (!gate.ok) return respond({ error: gate.error }, gate.status);

  const backend = alertsBackend();
  if (backend === "none") {
    return respond(
      {
        error:
          "Alert rules need Postgres or a writable file log path (ERROR_LOG_FILE_* / OBSERVABILITY_ALERT_RULES_PATH).",
        code: "alerts_backend_unavailable",
        rules: [],
        backend,
      },
      503,
    );
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return respond({ error: "Invalid alert-rules request" }, 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return respond({ error: "Invalid alert-rules request" }, 400);
  }

  const body = parsed.data;
  const isMutation = body.action !== "list";

  const recordOutcome = (
    outcome: "success" | "denied" | "error",
    metadata: Record<string, string>,
  ) =>
    auditLog.log({
      userId: gate.session.user.id,
      action: "site_admin.observability.alert_rules",
      resourceType: "site_admin",
      resourceId:
        body.action === "update" || body.action === "delete" ? body.id : "*",
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  if (isMutation) {
    const challenge = await verifyFreshMfaStepUp({
      userId: gate.session.user.id,
      code: body.mfaCode,
    });
    if (!challenge.ok) {
      try {
        await recordOutcome(challenge.outcome, {
          phase: "alert_rules_challenge",
          reason: `mfa_step_up_${challenge.code}`,
          alertAction: body.action,
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
          error: "Fresh MFA is required before changing alert rules.",
          code: `mfa_step_up_${challenge.code}`,
        },
        challenge.status,
        headers,
      );
    }
  }

  try {
    if (isMutation) {
      try {
        await recordOutcome("success", {
          phase: "alert_rules_authorized",
          alertAction: body.action,
        });
      } catch {
        return respond(
          {
            error:
              "The rule change was not started because its access event could not be confirmed.",
            code: "audit_unavailable",
          },
          503,
        );
      }
    }

    const run = async () => {
      if (body.action === "list") {
        return { rules: await listObservabilityAlertRules(), backend };
      }
      if (body.action === "create") {
        const recipients = resolveRecipients(body.recipients);
        if ("error" in recipients) return recipients;
        const rule = await createObservabilityAlertRule({
          name: body.name,
          enabled: body.enabled,
          minLevel: body.minLevel,
          sources: body.sources ?? null,
          fingerprint: body.fingerprint,
          unionId: body.unionId,
          thresholdCount: body.thresholdCount,
          windowMinutes: body.windowMinutes,
          cooldownMinutes: body.cooldownMinutes,
          recipients,
          recipientsByUnion: body.recipientsByUnion ?? null,
          emailFormat: body.emailFormat,
          userId: gate.session.user.id,
        });
        return { rule, backend };
      }
      if (body.action === "update") {
        let recipients = body.recipients;
        if (recipients !== undefined) {
          const resolved = resolveRecipients(recipients);
          if ("error" in resolved) return resolved;
          recipients = resolved;
        }
        const rule = await updateObservabilityAlertRule({
          id: body.id,
          name: body.name,
          enabled: body.enabled,
          minLevel: body.minLevel,
          sources: body.sources,
          fingerprint: body.fingerprint,
          unionId: body.unionId,
          thresholdCount: body.thresholdCount,
          windowMinutes: body.windowMinutes,
          cooldownMinutes: body.cooldownMinutes,
          recipients,
          recipientsByUnion: body.recipientsByUnion,
          emailFormat: body.emailFormat,
          userId: gate.session.user.id,
        });
        if (!rule) {
          return { error: "Alert rule not found", code: "not_found" };
        }
        return { rule, backend };
      }
      const deleted = await deleteObservabilityAlertRule(body.id);
      if (!deleted) {
        return { error: "Alert rule not found", code: "not_found" };
      }
      return { deleted: true, id: body.id, backend };
    };

    const payload = isPostgresConfigured()
      ? await withRlsContext(
          {
            userId: gate.session.user.id,
            platformAdmin: true,
            mfaVerified: true,
          },
          run,
        )
      : await run();

    if ("error" in payload && payload.error) {
      const status =
        "code" in payload && payload.code === "not_found" ? 404 : 400;
      return respond(payload, status);
    }

    if (isMutation) {
      try {
        await recordOutcome("success", {
          phase: "alert_rules_result",
          alertAction: body.action,
        });
      } catch {
        return respond(
          {
            error:
              "Rule change could not be confirmed because access evidence is unavailable.",
            code: "alert_rules_result_unconfirmed",
          },
          503,
        );
      }
    }

    return respond(payload);
  } catch {
    if (isMutation) {
      await recordOutcome("error", {
        phase: "alert_rules_result",
        reason: "observability_alert_rules_failed",
        alertAction: body.action,
      }).catch(() => undefined);
    }
    return respond({ error: "Could not update alert rules." }, 503);
  }
}

export async function GET() {
  const { respond } = responseContext();
  return respond(
    { error: "Use POST to manage observability alert rules." },
    405,
    { Allow: "POST" },
  );
}
