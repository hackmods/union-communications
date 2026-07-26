import type {
  CreateTimeShiftInput,
  TimeShiftSeries,
} from "@/types/time";

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function parseTime(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weeksBetween(start: Date, current: Date): number {
  const ms = current.getTime() - start.getTime();
  return Math.floor(ms / (7 * 86_400_000));
}

/** Enumerate occurrence date keys in [from, to] for a shift series. */
export function expandSeriesOccurrenceDates(
  series: Pick<TimeShiftSeries, "recurrence" | "startTime" | "durationMinutes">,
  from: string,
  to: string,
): string[] {
  const rule = series.recurrence;
  const fromDate = parseDateKey(from.slice(0, 10));
  const toDate = parseDateKey(to.slice(0, 10));
  const anchor = parseDateKey(rule.startsOn);
  const dates: string[] = [];
  let count = 0;

  for (
    let cursor = new Date(anchor);
    cursor <= toDate;
    cursor = addDays(cursor, 1)
  ) {
    if (cursor < fromDate) continue;
    if (rule.endsOn && formatDateKey(cursor) > rule.endsOn) break;
    if (rule.maxOccurrences != null && count >= rule.maxOccurrences) break;

    const weekday = cursor.getUTCDay();
    let matches = false;
    const interval = rule.interval ?? 1;

    switch (rule.frequency) {
      case "daily": {
        const daysSince = Math.floor(
          (cursor.getTime() - anchor.getTime()) / 86_400_000,
        );
        matches = daysSince >= 0 && daysSince % interval === 0;
        break;
      }
      case "weekly": {
        const weeks = weeksBetween(anchor, cursor);
        const weekdays = rule.weekdays ?? [anchor.getUTCDay()];
        matches =
          weeks >= 0 &&
          weeks % interval === 0 &&
          weekdays.includes(weekday);
        break;
      }
      case "biweekly": {
        const weeks = weeksBetween(anchor, cursor);
        const weekdays = rule.weekdays ?? [anchor.getUTCDay()];
        matches =
          weeks >= 0 &&
          weeks % 2 === 0 &&
          weekdays.includes(weekday);
        break;
      }
    }

    if (matches) {
      dates.push(formatDateKey(cursor));
      count += 1;
    }
  }

  return dates;
}

/** Build shift create inputs for each occurrence date. */
export function buildShiftInstancesFromSeries(
  series: TimeShiftSeries,
  from: string,
  to: string,
): CreateTimeShiftInput[] {
  const time = parseTime(series.startTime);
  if (!time) return [];

  const dates = expandSeriesOccurrenceDates(series, from, to);
  return dates.map((dateKey) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    const startsAt = new Date(
      Date.UTC(y, m - 1, d, time.hour, time.minute, 0),
    );
    const endsAt = new Date(
      startsAt.getTime() + series.durationMinutes * 60_000,
    );
    return {
      label: series.label,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      category: series.category,
      siteId: series.siteId,
      jobCodeId: series.jobCodeId,
      assignedWorkerIds: [...series.assignedWorkerIds],
      status: series.status === "cancelled" ? "draft" : series.status,
    };
  });
}
