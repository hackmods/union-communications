import type { TimeEntry } from "@/types/time";

/** 8d-lite — simple weekly OT threshold (not a payroll engine). */
export type OtPayPeriodPolicy = {
  /** Calendar days in a pay period window for export snap. Default 14. */
  periodDays: number;
  /** Hours in a rolling ISO week before OT flag. Default 40. */
  weeklyOtHours: number;
};

export const DEFAULT_OT_PAY_PERIOD_POLICY: OtPayPeriodPolicy = {
  periodDays: 14,
  weeklyOtHours: 40,
};

export function entryDurationHours(entry: TimeEntry): number {
  if (!entry.clockOutAt) return 0;
  const ms =
    new Date(entry.clockOutAt).getTime() - new Date(entry.clockInAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return ms / 3_600_000;
}

/** ISO week key (UTC) for grouping. */
export function isoWeekKey(iso: string): string {
  const d = new Date(iso);
  const utc = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Mark entries whose completed hours push the worker over the weekly OT
 * threshold (flag on the entry that crosses / sits above the line).
 */
export function weeklyOtFlags(
  entries: TimeEntry[],
  weeklyOtHours = DEFAULT_OT_PAY_PERIOD_POLICY.weeklyOtHours,
): Map<string, boolean> {
  const flags = new Map<string, boolean>();
  const byWorkerWeek = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    if (!e.clockOutAt) {
      flags.set(e.id, false);
      continue;
    }
    const key = `${e.workerId}::${isoWeekKey(e.clockInAt)}`;
    const list = byWorkerWeek.get(key) ?? [];
    list.push(e);
    byWorkerWeek.set(key, list);
  }
  for (const list of byWorkerWeek.values()) {
    list.sort((a, b) => a.clockInAt.localeCompare(b.clockInAt));
    let running = 0;
    for (const e of list) {
      const hours = entryDurationHours(e);
      const before = running;
      running += hours;
      flags.set(e.id, before < weeklyOtHours && running > weeklyOtHours
        ? true
        : running > weeklyOtHours);
    }
  }
  return flags;
}

/** Inclusive pay-period window ending at `anchor` (UTC day). */
export function payPeriodBounds(
  anchor: Date,
  periodDays = DEFAULT_OT_PAY_PERIOD_POLICY.periodDays,
): { from: string; to: string } {
  const end = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (periodDays - 1));
  start.setUTCHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}
