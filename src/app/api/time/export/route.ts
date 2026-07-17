import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  listFiltersForTimeSession,
  requireTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/memory-adapter";
import type { TimeEntry } from "@/types/time";
import type { UserRole } from "@/types/tenant";

function toCsv(rows: TimeEntry[]): string {
  const header =
    "id,worker,category,job_code,status,entry_source,event_id,event_label,clock_in,clock_out,duration_hours,notes";
  const lines = rows.map((e) => {
    const durationMs = e.clockOutAt
      ? new Date(e.clockOutAt).getTime() - new Date(e.clockInAt).getTime()
      : 0;
    const durationHours = (durationMs / 3_600_000).toFixed(2);
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
  const filters = {
    ...listFiltersForTimeSession(session),
    workerId: undefined,
    category: category as TimeEntry["category"] | undefined,
    from,
    to,
  };
  const entries = await timeStore.listEntries(filters);
  const csv = toCsv(entries);

  await auditLog.log({
    userId: session.user.id,
    action: "time.export.csv",
    resourceType: "time_entry",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="time-export.csv"',
    },
  });
}
