import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForTimeSession,
  requireTimeSession,
  tenantIdsForTimeSession,
} from "@/lib/auth/time-session";
import { canAdminTime } from "@/lib/time/access";
import { timeStore } from "@/lib/time/memory-adapter";
import type { TimeCategory, TimeEntry } from "@/types/time";
import type { UserRole } from "@/types/tenant";

const UNION_BUSINESS_CATEGORIES: TimeCategory[] = [
  "release",
  "duty_bank",
  "action",
  "volunteer",
  "staff",
];

function durationHours(entry: TimeEntry): number {
  if (!entry.clockOutAt) return 0;
  return (
    (new Date(entry.clockOutAt).getTime() - new Date(entry.clockInAt).getTime()) /
    3_600_000
  );
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 30);
  return { from: from.toISOString(), to: to.toISOString() };
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
  const defaults = defaultRange();
  const from = url.searchParams.get("from") ?? defaults.from;
  const to = url.searchParams.get("to") ?? defaults.to;
  const { unionId, localId } = tenantIdsForTimeSession(session);

  const baseFilters = {
    ...listFiltersForTimeSession(session),
    workerId: undefined,
    from,
    to,
  };

  const allEntries = await timeStore.listEntries(baseFilters);
  const entries = allEntries.filter((e) =>
    UNION_BUSINESS_CATEGORIES.includes(e.category),
  );
  const needed = await timeStore.listNeededEntries({
    unionId,
    localId,
    from,
    to,
  });

  const byWorker = new Map<
    string,
    { workerId: string; workerName: string; hours: number; entries: number }
  >();
  const byCategory = new Map<string, { category: string; hours: number }>();
  const byEvent = new Map<
    string,
    { eventId: string; eventLabel: string; hours: number; workers: number }
  >();

  for (const entry of entries) {
    const hours = durationHours(entry);
    const worker = byWorker.get(entry.workerId) ?? {
      workerId: entry.workerId,
      workerName: entry.workerName,
      hours: 0,
      entries: 0,
    };
    worker.hours += hours;
    worker.entries += 1;
    byWorker.set(entry.workerId, worker);

    const cat = byCategory.get(entry.category) ?? {
      category: entry.category,
      hours: 0,
    };
    cat.hours += hours;
    byCategory.set(entry.category, cat);

    if (entry.eventId) {
      const ev = byEvent.get(entry.eventId) ?? {
        eventId: entry.eventId,
        eventLabel: entry.eventLabel ?? entry.eventId,
        hours: 0,
        workers: 0,
      };
      ev.hours += hours;
      ev.workers += 1;
      byEvent.set(entry.eventId, ev);
    }
  }

  await auditLog.log({
    userId: session.user.id,
    action: "time.report.union_business",
    resourceType: "time_entry",
    resourceId: "*",
    unionId,
    localId,
  });

  return NextResponse.json({
    from,
    to,
    entries,
    needed,
    totals: {
      byWorker: [...byWorker.values()].sort((a, b) => b.hours - a.hours),
      byCategory: [...byCategory.values()].sort((a, b) => b.hours - a.hours),
      byEvent: [...byEvent.values()].sort((a, b) => b.hours - a.hours),
      totalHours: entries.reduce((sum, e) => sum + durationHours(e), 0),
      entryCount: entries.length,
      neededCount: needed.length,
    },
  });
}
