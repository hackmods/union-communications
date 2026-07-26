/**
 * Period keys for check-in schedules (UTC calendar days).
 *
 * - daily: YYYY-MM-DD of today (UTC)
 * - weekdays: same, but null on Sat/Sun (no active period)
 * - weekly: YYYY-MM-DD of the most recent occurrence of `weekday` (incl. today)
 */

import type {
  CheckinCadence,
  CheckinPeriodInfo,
  CheckinSchedule,
} from "@/types/checkins";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a UTC date as YYYY-MM-DD. */
export function formatUtcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Current period for a schedule at `now`, or null when not in an active window
 * (weekdays cadence on weekends).
 */
export function currentPeriodForSchedule(
  schedule: Pick<CheckinSchedule, "cadence" | "weekday">,
  now: Date = new Date(),
): CheckinPeriodInfo | null {
  return currentPeriodForCadence(schedule.cadence, schedule.weekday, now);
}

export function currentPeriodForCadence(
  cadence: CheckinCadence,
  weekday: number | undefined,
  now: Date = new Date(),
): CheckinPeriodInfo | null {
  const day = startOfUtcDay(now);

  if (cadence === "daily") {
    const key = formatUtcDateKey(day);
    return { periodKey: key, periodLabel: key };
  }

  if (cadence === "weekdays") {
    const dow = day.getUTCDay();
    if (dow === 0 || dow === 6) return null;
    const key = formatUtcDateKey(day);
    return { periodKey: key, periodLabel: key };
  }

  // weekly
  const target =
    typeof weekday === "number" && weekday >= 0 && weekday <= 6 ? weekday : 1;
  const cursor = new Date(day);
  while (cursor.getUTCDay() !== target) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  const key = formatUtcDateKey(cursor);
  const label = `${WEEKDAY_SHORT[target]} week of ${key}`;
  return { periodKey: key, periodLabel: label };
}

/** True when the schedule expects an answer in the current period. */
export function isScheduleInActivePeriod(
  schedule: Pick<CheckinSchedule, "cadence" | "weekday" | "active">,
  now: Date = new Date(),
): boolean {
  if (!schedule.active) return false;
  return currentPeriodForSchedule(schedule, now) != null;
}
