import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import {
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { canAdminTime } from "@/lib/time/access";
import {
  buildTimeExportPdf,
  buildTimeExportXlsx,
} from "@/lib/time/export-rollup";
import { applyOtPolicy, resolveOtPolicy } from "@/lib/time/ot-policy";
import {
  entryDurationHours,
  weeklyOtFlags,
} from "@/lib/time/pay-period";
import { timeStore } from "@/lib/time/store";
import { reportApiFailure } from "@/lib/observability/report-server-error";
import type { TimeEntry } from "@/types/time";
import type { UserRole } from "@/types/tenant";

type TimeExportFormat = "csv" | "xlsx" | "pdf";
const TIME_CATEGORIES: TimeEntry["category"][] = [
  "staff",
  "release",
  "duty_bank",
  "action",
  "volunteer",
];

function isFormat(value: unknown): value is TimeExportFormat {
  return value === "csv" || value === "xlsx" || value === "pdf";
}

function toCsv(
  rows: TimeEntry[],
  otFlags: Map<string, boolean>,
  otBreakdown?: ReturnType<typeof applyOtPolicy>,
): string {
  const header =
    "id,worker,category,job_code,status,entry_source,event_id,event_label,clock_in,clock_out,duration_hours,ot_weekly_flag,regular_hours,ot_hours,double_hours,holiday_hours,notes";
  const lines = rows.map((e) => {
    const durationHours = entryDurationHours(e).toFixed(2);
    const ot = otBreakdown?.get(e.id);
    const cols = [
      e.id,
      e.workerName,
      e.category,
      e.jobCodeLabel,
      e.status,
      e.entrySource,
      e.eventId ?? "",
      e.eventLabel ?? "",
      e.clockInAt,
      e.clockOutAt ?? "",
      durationHours,
      otFlags.get(e.id) ? "yes" : "no",
      ot?.regularHours.toFixed(2) ?? "",
      ot?.otHours.toFixed(2) ?? "",
      ot?.doubleHours.toFixed(2) ?? "",
      ot?.holidayHours.toFixed(2) ?? "",
      (e.notes ?? "").replace(/"/g, '""'),
    ];
    return cols.map((c) => `"${c}"`).join(",");
  });
  return [header, ...lines].join("\n");
}

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
  if (!canAdminTime(roles)) return respond({ error: "Forbidden" }, 403);

  const rawBody = await request.json().catch(() => null);
  if (
    !rawBody ||
    typeof rawBody !== "object" ||
    Array.isArray(rawBody) ||
    Object.keys(rawBody).some(
      (key) => !["category", "from", "to", "format", "mfaCode"].includes(key),
    )
  ) {
    return respond({ error: "Invalid time export request" }, 400);
  }
  const body = rawBody as {
    category?: unknown;
    from?: unknown;
    to?: unknown;
    format?: unknown;
    mfaCode?: unknown;
  };
  if (
    !isFormat(body.format) ||
    (body.category !== undefined &&
      (typeof body.category !== "string" ||
        !TIME_CATEGORIES.includes(body.category as TimeEntry["category"]))) ||
    (body.from !== undefined &&
      (typeof body.from !== "string" || !Number.isFinite(Date.parse(body.from)))) ||
    (body.to !== undefined &&
      (typeof body.to !== "string" || !Number.isFinite(Date.parse(body.to)))) ||
    (typeof body.from === "string" &&
      typeof body.to === "string" &&
      Date.parse(body.from) > Date.parse(body.to)) ||
    (body.mfaCode !== undefined &&
      (typeof body.mfaCode !== "string" || body.mfaCode.length > 32))
  ) {
    return respond({ error: "Invalid time export filters or format" }, 400);
  }

  const format = body.format;
  const category = body.category as TimeEntry["category"] | undefined;
  const from = body.from as string | undefined;
  const to = body.to as string | undefined;
  const { unionId, localId } = tenantIdsForTimeSession(session);
  const action = `time.export.${format}`;
  const record = (
    outcome: "success" | "denied" | "error",
    metadata?: Record<string, string>,
  ) =>
    auditLog.log({
      userId: session.user.id,
      action,
      resourceType: "time_entry",
      resourceId: "*",
      unionId,
      localId,
      outcome,
      requestId: correlation.requestId,
      metadata: { format, ...(category ? { category } : {}), ...metadata },
    });

  const challenge = await verifyFreshMfaStepUp({
    userId: session.user.id,
    code: typeof body.mfaCode === "string" ? body.mfaCode : undefined,
  });
  if (!challenge.ok) {
    try {
      await record(challenge.outcome, {
        reason: `mfa_step_up_${challenge.code}`,
      });
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
            ? "A fresh MFA code is required before exporting time records."
            : "Fresh MFA verification failed.",
        code: `mfa_step_up_${challenge.code}`,
      },
      challenge.status,
      challenge.retryAfterSeconds
        ? { "Retry-After": String(challenge.retryAfterSeconds) }
        : undefined,
    );
  }

  let entries: TimeEntry[];
  let file: string | Blob | Uint8Array;
  let contentType: string;
  let filename: string;
  try {
    const filters = {
      ...listFiltersForTimeSession(session),
      workerId: undefined,
      category,
      from,
      to,
    };
    entries = await timeStore.listEntries(filters);
    if (format === "xlsx") {
      file = new Uint8Array(await buildTimeExportXlsx(entries));
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = "time-export.xlsx";
    } else if (format === "pdf") {
      file = await buildTimeExportPdf(entries);
      contentType = "application/pdf";
      filename = "time-rollup.pdf";
    } else {
      const otFlags = weeklyOtFlags(entries);
      const policies = await timeStore.listOtPolicies(unionId, localId);
      const activePolicy = resolveOtPolicy(policies);
      const otBreakdown = activePolicy
        ? applyOtPolicy(entries, activePolicy)
        : undefined;
      file = toCsv(entries, otFlags, otBreakdown);
      contentType = "text/csv; charset=utf-8";
      filename = "time-export.csv";
    }
  } catch (error) {
    reportApiFailure(error, "/api/time/export");
    await record("error", { reason: "export_generation_failed" }).catch(
      () => undefined,
    );
    return respond({ error: "Time export failed", code: "export_failed" }, 500);
  }

  try {
    await record("success", { rowCount: String(entries.length) });
  } catch {
    return respond(
      {
        error: "The time export was not delivered because its audit record could not be confirmed.",
        code: "export_audit_unavailable",
      },
      503,
    );
  }

  const responseBody = typeof file === "string"
    ? file
    : file instanceof Blob
      ? await file.arrayBuffer()
      : new Uint8Array(file).buffer;
  return new NextResponse(responseBody, {
    headers: correlation.responseHeaders({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    }),
  });
}

/** Retire the query-string download path so callers cannot skip the challenge. */
export async function GET() {
  const correlation = createAuditRequestContext();
  return NextResponse.json(
    { error: "Use POST to request a time export.", code: "method_not_allowed" },
    {
      status: 405,
      headers: correlation.responseHeaders({
        Allow: "POST",
        "Cache-Control": "private, no-store",
      }),
    },
  );
}
