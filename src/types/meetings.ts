/** Calendar & Meetings Phase A — recurring local membership meeting schedule (no auto-email). */

export type MeetingRecurrence = "monthly" | "custom";

export interface LocalMeetingSchedule {
  id: string;
  unionId: string;
  localId: string;
  /** "monthly" computes a recurring date; "custom" uses an explicit list of upcoming dates. */
  recurrence: MeetingRecurrence;
  /** Monthly-by-date, e.g. 15 for "the 15th of each month". Mutually exclusive with weekday/nthWeekOfMonth. */
  dayOfMonth?: number;
  /** Monthly-by-weekday, 0 (Sunday) - 6 (Saturday). Requires nthWeekOfMonth. */
  weekday?: number;
  /** 1-4 for 1st..4th occurrence in the month, or -1 for "last". Requires weekday. */
  nthWeekOfMonth?: number;
  /** ISO date strings (YYYY-MM-DD) for one-off / irregular schedules. */
  customDates?: string[];
  /** 24h HH:mm local time in `timezone`. */
  time: string;
  durationMinutes: number;
  location: string;
  /** Shown on the public "next meeting" snippet — keep free of internal/PII detail. */
  publicBlurb?: string;
  /** IANA timezone, e.g. "America/Toronto". */
  timezone: string;
  /** Stable public identifier for the unauthenticated "next meeting" page/embed. */
  publicSlug: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMeetingScheduleInput {
  recurrence: MeetingRecurrence;
  dayOfMonth?: number;
  weekday?: number;
  nthWeekOfMonth?: number;
  customDates?: string[];
  time: string;
  durationMinutes?: number;
  location: string;
  publicBlurb?: string;
  timezone: string;
}

/** Computed next-occurrence result — the only thing the public snippet ever sees. */
export interface NextMeetingInfo {
  startsAt: string;
  endsAt: string;
  location: string;
  publicBlurb?: string;
  timezone: string;
}
