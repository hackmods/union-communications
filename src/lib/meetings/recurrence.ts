import type { LocalMeetingSchedule, NextMeetingInfo } from "@/types/meetings";

/**
 * Recurrence math for `LocalMeetingSchedule`.
 *
 * Like `src/lib/calendar/ics.ts`, this treats the configured `time` as a
 * wall-clock value and does date arithmetic in UTC fields — there is no
 * `VTIMEZONE` support yet, so DST transitions in `schedule.timezone` are not
 * modeled. `timezone` is stored/displayed for the officer's/member's own
 * reference. Good enough for "meeting is on the 3rd Tuesday at 7pm" style
 * schedules; revisit if/when real timezone conversion is needed.
 */

function clampDayOfMonth(year: number, month: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): number | null {
  if (nth === -1) {
    const last = new Date(Date.UTC(year, month + 1, 0));
    const lastWeekday = last.getUTCDay();
    const diff = (lastWeekday - weekday + 7) % 7;
    return last.getUTCDate() - diff;
  }
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = first.getUTCDay();
  const diff = (weekday - firstWeekday + 7) % 7;
  const day = 1 + diff + (nth - 1) * 7;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return day <= lastDay ? day : null;
}

function buildOccurrence(
  year: number,
  month: number,
  day: number,
  time: string,
): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return new Date(Date.UTC(year, month, day, hour, minute, 0));
}

/** Next occurrence strictly after `from` (defaults to now), or null if none is configured/found. */
export function computeNextOccurrence(
  schedule: Pick<
    LocalMeetingSchedule,
    | "recurrence"
    | "dayOfMonth"
    | "weekday"
    | "nthWeekOfMonth"
    | "customDates"
    | "time"
  >,
  from: Date = new Date(),
): Date | null {
  if (schedule.recurrence === "custom") {
    const dates = (schedule.customDates ?? [])
      .map((d) => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.trim());
        if (!match) return null;
        return buildOccurrence(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          schedule.time,
        );
      })
      .filter((d): d is Date => d != null && d.getTime() > from.getTime())
      .sort((a, b) => a.getTime() - b.getTime());
    return dates[0] ?? null;
  }

  let year = from.getUTCFullYear();
  let month = from.getUTCMonth();
  for (let i = 0; i < 24; i += 1) {
    let day: number | null = null;
    if (schedule.dayOfMonth) {
      day = clampDayOfMonth(year, month, schedule.dayOfMonth);
    } else if (schedule.weekday != null && schedule.nthWeekOfMonth) {
      day = nthWeekdayOfMonth(
        year,
        month,
        schedule.weekday,
        schedule.nthWeekOfMonth,
      );
    }
    if (day != null) {
      const occurrence = buildOccurrence(year, month, day, schedule.time);
      if (occurrence && occurrence.getTime() > from.getTime()) {
        return occurrence;
      }
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return null;
}

export function computeNextMeeting(
  schedule: LocalMeetingSchedule,
  from: Date = new Date(),
): NextMeetingInfo | null {
  const start = computeNextOccurrence(schedule, from);
  if (!start) return null;
  const durationMinutes = schedule.durationMinutes || 90;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    location: schedule.location,
    publicBlurb: schedule.publicBlurb,
    timezone: schedule.timezone,
  };
}

export function daysUntil(iso: string, from: Date = new Date()): number {
  const ms = new Date(iso).getTime() - from.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
