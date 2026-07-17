import type {
  TimeEntry,
  TimeExpectedWindow,
  TimeNeededRow,
  TimeWorker,
} from "@/types/time";

const COUNTED_STATUSES = new Set(["completed", "submitted", "approved"]);

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const a0 = new Date(aStart).getTime();
  const a1 = new Date(aEnd).getTime();
  const b0 = new Date(bStart).getTime();
  const b1 = new Date(bEnd).getTime();
  if (
    Number.isNaN(a0) ||
    Number.isNaN(a1) ||
    Number.isNaN(b0) ||
    Number.isNaN(b1)
  ) {
    return false;
  }
  return a0 < b1 && b0 < a1;
}

export function entryCoversRange(
  entry: TimeEntry,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  if (!COUNTED_STATUSES.has(entry.status)) return false;
  if (!entry.clockOutAt) return false;
  return rangesOverlap(entry.clockInAt, entry.clockOutAt, rangeStart, rangeEnd);
}

export function hasOverlappingEntry(
  entries: TimeEntry[],
  workerId: string,
  clockInAt: string,
  clockOutAt: string,
): boolean {
  return entries.some((e) => {
    if (e.workerId !== workerId) return false;
    if (e.status === "rejected") return false;
    const end = e.clockOutAt ?? (e.status === "active" ? clockOutAt : undefined);
    if (!end) return false;
    return rangesOverlap(e.clockInAt, end, clockInAt, clockOutAt);
  });
}

function dateKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekdayUtc(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

function eachUtcDay(from: string, to: string): Date[] {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days: Date[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function dayBoundsUtc(day: Date): { start: string; end: string } {
  const y = day.getUTCFullYear();
  const m = day.getUTCMonth();
  const d = day.getUTCDate();
  return {
    start: new Date(Date.UTC(y, m, d, 0, 0, 0, 0)).toISOString(),
    end: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)).toISOString(),
  };
}

function windowCoversDay(window: TimeExpectedWindow, day: Date): boolean {
  const { start, end } = dayBoundsUtc(day);
  return rangesOverlap(window.startsAt, window.endsAt, start, end);
}

export function computeNeededEntries(input: {
  workers: TimeWorker[];
  windows: TimeExpectedWindow[];
  entries: TimeEntry[];
  from: string;
  to: string;
  workerId?: string;
}): TimeNeededRow[] {
  const workers = input.workers.filter(
    (w) => w.active && (!input.workerId || w.id === input.workerId || w.userId === input.workerId),
  );
  const needed: TimeNeededRow[] = [];

  const windowsInRange = input.windows.filter((w) =>
    rangesOverlap(w.startsAt, w.endsAt, input.from, input.to),
  );

  for (const window of windowsInRange) {
    for (const attendeeId of window.attendeeWorkerIds) {
      const worker = workers.find(
        (w) => w.id === attendeeId || w.userId === attendeeId,
      );
      if (!worker) continue;
      const covered = input.entries.some(
        (e) =>
          (e.workerId === worker.id || e.workerId === worker.userId) &&
          entryCoversRange(e, window.startsAt, window.endsAt),
      );
      if (covered) continue;
      needed.push({
        kind: "expected_window",
        workerId: worker.id,
        workerName: worker.displayName,
        reason: "Missing entry for expected window",
        windowId: window.id,
        windowLabel: window.label,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        category: window.category,
      });
    }
  }

  for (const worker of workers) {
    if (!worker.trackGaps) continue;
    for (const day of eachUtcDay(input.from, input.to)) {
      if (!isWeekdayUtc(day)) continue;
      const { start, end } = dayBoundsUtc(day);
      const coveredByEntry = input.entries.some(
        (e) =>
          (e.workerId === worker.id || e.workerId === worker.userId) &&
          entryCoversRange(e, start, end),
      );
      if (coveredByEntry) continue;
      const coveredByWindow = windowsInRange.some(
        (w) =>
          w.attendeeWorkerIds.includes(worker.id) &&
          windowCoversDay(w, day),
      );
      // If they are expected that day via a window, the window miss already flags them.
      if (coveredByWindow) continue;
      const date = dateKeyUtc(day);
      needed.push({
        kind: "weekday_gap",
        workerId: worker.id,
        workerName: worker.displayName,
        reason: "No entry on weekday",
        date,
        startsAt: start,
        endsAt: end,
      });
    }
  }

  return needed.sort((a, b) =>
    (a.startsAt ?? a.date ?? "").localeCompare(b.startsAt ?? b.date ?? ""),
  );
}
