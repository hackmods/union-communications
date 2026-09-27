import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import {
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { applyOtPolicy, resolveOtPolicy } from "@/lib/time/ot-policy";
import {
  buildPayrollExportRows,
  payrollRowsToCsv,
  postPayrollWebhook,
} from "@/lib/time/payroll-hooks";
import { timeStore } from "@/lib/time/store";
import { canAdminTime } from "@/lib/time/access";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import type { PayrollExportRow } from "@/lib/time/payroll-hooks";
import type { UserRole } from "@/types/tenant";
import type { PayrollExportProfile } from "@/types/time";

export async function POST(request: Request) {
  const correlation = createAuditRequestContext();
  const respond = (
    body: unknown,
    status = 200,
    extraHeaders?: HeadersInit,
  ) => {
    const headers = new Headers(extraHeaders);
    headers.set("Cache-Control", "private, no-store");
    return NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders(headers),
    });
  };

  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return respond({ error: authResult.error }, authResult.status);
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAdminTime(roles)) {
    return respond({ error: "Forbidden" }, 403);
  }

  const rawBody = await request.json().catch(() => null);
  if (
    !rawBody ||
    typeof rawBody !== "object" ||
    Array.isArray(rawBody) ||
    Object.keys(rawBody).some(
      (key) => !["profileId", "from", "to", "mfaCode"].includes(key),
    )
  ) {
    return respond({ error: "Invalid payroll export request" }, 400);
  }
  const body = rawBody as {
    profileId?: unknown;
    from?: unknown;
    to?: unknown;
    mfaCode?: unknown;
  };
  if (
    typeof body.profileId !== "string" ||
    !body.profileId.trim() ||
    typeof body.from !== "string" ||
    !body.from.trim() ||
    typeof body.to !== "string" ||
    !body.to.trim()
  ) {
    return respond({ error: "profileId, from, and to are required" }, 400);
  }
  if (
    !Number.isFinite(Date.parse(body.from)) ||
    !Number.isFinite(Date.parse(body.to)) ||
    Date.parse(body.from) > Date.parse(body.to)
  ) {
    return respond({ error: "Invalid payroll export date range" }, 400);
  }
  if (
    body.mfaCode !== undefined &&
    (typeof body.mfaCode !== "string" || body.mfaCode.length > 32)
  ) {
    return respond({ error: "Invalid MFA challenge" }, 400);
  }

  const { unionId, localId } = tenantIdsForTimeSession(session);
  const record = (
    action: string,
    outcome: "success" | "denied" | "error",
    resourceId: string,
    metadata?: Record<string, string>,
  ) =>
    auditLog.log({
      userId: session.user.id,
      action,
      resourceType: "payroll_export_profile",
      resourceId,
      unionId,
      localId,
      outcome,
      requestId: correlation.requestId,
      metadata,
    });

  let profile: PayrollExportProfile | undefined;
  try {
    const profiles = await timeStore.listPayrollProfiles(unionId, localId);
    profile = profiles.find((p) => p.id === body.profileId && p.active);
  } catch (error) {
    reportApiFailure(error, "/api/time/payroll-export");
    await record("time.payroll_export", "error", body.profileId, {
      reason: "profile_lookup_failed",
    }).catch(() => undefined);
    return respond(
      { error: "Payroll export is temporarily unavailable.", code: "export_unavailable" },
      503,
    );
  }
  if (!profile) {
    try {
      await record("time.payroll_export", "denied", body.profileId, {
        reason: "profile_missing_or_inactive",
      });
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        503,
      );
    }
    return respond({ error: "Profile not found" }, 404);
  }

  const challenge = await verifyFreshMfaStepUp({
    userId: session.user.id,
    code: typeof body.mfaCode === "string" ? body.mfaCode : undefined,
  });
  if (!challenge.ok) {
    try {
      await record(
        "time.payroll_export",
        challenge.outcome,
        profile.id,
        { reason: `mfa_step_up_${challenge.code}` },
      );
    } catch {
      return respond(
        { error: "Audit service unavailable", code: "audit_unavailable" },
        503,
      );
    }
    return respond(
      {
        error:
          challenge.code === "required"
            ? "A fresh MFA code is required before payroll export."
            : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      challenge.retryAfterSeconds
        ? { "Retry-After": String(challenge.retryAfterSeconds) }
        : undefined,
    );
  }

  let rows: PayrollExportRow[];
  let csv: string;
  try {
    const entries = await timeStore.listEntries({
      ...listFiltersForTimeSession(session),
      from: body.from,
      to: body.to,
      status: "approved",
    });
    const workers = await timeStore.listWorkers({
      unionId,
      localId,
      includeInactive: true,
    });

    let otBreakdown;
    if (profile.includeOtBreakdown) {
      const policies = await timeStore.listOtPolicies(unionId, localId);
      const policy = resolveOtPolicy(policies);
      if (policy) otBreakdown = applyOtPolicy(entries, policy);
    }

    rows = buildPayrollExportRows({
      profile,
      entries,
      workers,
      otBreakdown,
    });
    csv = payrollRowsToCsv(rows);
  } catch (error) {
    reportApiFailure(error, "/api/time/payroll-export");
    await record("time.payroll_export", "error", profile.id, {
      reason: "export_generation_failed",
    }).catch(() => undefined);
    return respond(
      { error: "Payroll export could not be built.", code: "export_failed" },
      500,
    );
  }

  // Require an audit record before the configured webhook can receive payroll rows.
  try {
    await record("time.payroll_export.requested", "success", profile.id, {
      rowCount: String(rows.length),
      webhookConfigured: String(Boolean(profile.webhookUrl?.trim())),
    });
  } catch {
    return respond(
      { error: "Payroll export was stopped because its audit record could not be confirmed.", code: "audit_unavailable" },
      503,
    );
  }

  let webhook: Awaited<ReturnType<typeof postPayrollWebhook>>;
  try {
    webhook = await postPayrollWebhook(profile, {
      rows,
      from: body.from,
      to: body.to,
    });
  } catch (error) {
    reportApiFailure(error, "/api/time/payroll-export");
    webhook = { ok: false };
  }

  try {
    await record(
      "time.payroll_export",
      webhook.ok ? "success" : "error",
      profile.id,
      {
        rowCount: String(rows.length),
        webhookOk: String(webhook.ok),
        ...(webhook.status === undefined
          ? {}
          : { webhookStatus: String(webhook.status) }),
      },
    );
  } catch {
    return respond(
      {
        error: "The payroll webhook may already have received this export. Check with the instance operator before retrying.",
        code: "payroll_result_audit_unavailable",
      },
      503,
    );
  }

  return new NextResponse(csv, {
    headers: correlation.responseHeaders({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payroll-export.csv"',
      "Cache-Control": "private, no-store",
      "X-Payroll-Webhook-Ok": webhook.ok ? "true" : "false",
    }),
  });
}
