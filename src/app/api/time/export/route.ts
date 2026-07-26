import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import {
  buildTimeExportPdf,
  buildTimeExportXlsx,
} from "@/lib/time/export-rollup";
import {
  applyOtPolicy,
  resolveOtPolicy,
} from "@/lib/time/ot-policy";
import {
  entryDurationHours,
  weeklyOtFlags,
} from "@/lib/time/pay-period";
import { timeStore } from "@/lib/time/store";
import type { TimeEntry } from "@/types/time";
import type { UserRole } from "@/types/tenant";

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

export async function GET(request: Request) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAdminTime(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const filters = {
    ...listFiltersForTimeSession(session),
    workerId: undefined,
    category: category as TimeEntry["category"] | undefined,
    from,
    to,
  };
  const entries = await timeStore.listEntries(filters);
  const otFlags = weeklyOtFlags(entries);
  const { unionId, localId } = tenantIdsForTimeSession(session);
  const policies = await timeStore.listOtPolicies(unionId, localId);
  const activePolicy = resolveOtPolicy(policies);
  const otBreakdown = activePolicy
    ? applyOtPolicy(entries, activePolicy)
    : undefined;

  await auditLog.log({
    userId: session.user.id,
    action: `time.export.${format === "xlsx" || format === "pdf" ? format : "csv"}`,
    resourceType: "time_entry",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  if (format === "xlsx") {
    const buf = await buildTimeExportXlsx(entries);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="time-export.xlsx"',
      },
    });
  }

  if (format === "pdf") {
    const blob = await buildTimeExportPdf(entries);
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="time-rollup.pdf"',
      },
    });
  }

  const csv = toCsv(entries, otFlags, otBreakdown);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="time-export.csv"',
    },
  });
}
