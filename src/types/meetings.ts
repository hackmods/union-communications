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

/* ── Calendar R1 — Hub event + tokenized RSVP (not grievance ScheduledMeeting) ── */

export type RsvpAttending = "yes" | "no" | "maybe";
export type RsvpJoinMode = "on_site" | "remote";
export type RsvpSource = "public_form" | "officer_entry";

export interface UnionMeeting {
  id: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  publicBlurb?: string;
  quorumNeeded?: number;
  /** Hybrid LEC meetings — on site + remote join modes. */
  hybrid: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface RsvpToken {
  id: string;
  meetingId: string;
  /** Opaque share token used in /r/[token]. */
  token: string;
  expiresAt?: string;
  revokedAt?: string;
  createdById: string;
  createdAt: string;
}

export interface RsvpResponse {
  id: string;
  meetingId: string;
  unionId: string;
  localId: string;
  attending: RsvpAttending;
  /** Required when attending is yes or maybe. */
  joinMode?: RsvpJoinMode;
  displayName: string;
  email?: string;
  phone?: string;
  guestsOnSite?: number;
  dietaryNote?: string;
  accessibilityNote?: string;
  roleOrOffice?: string;
  source: RsvpSource;
  consentAcceptedAt?: string;
  createdAt: string;
  /** SHA-256 of client IP + salt — never store raw IP. */
  ipHash?: string;
}

export interface CreateUnionMeetingInput {
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  publicBlurb?: string;
  quorumNeeded?: number;
  hybrid?: boolean;
  bargainingUnitId?: string;
}

export interface UpdateUnionMeetingInput {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  publicBlurb?: string | null;
  quorumNeeded?: number | null;
  hybrid?: boolean;
  bargainingUnitId?: string | null;
}

export interface SubmitRsvpInput {
  attending: RsvpAttending;
  joinMode?: RsvpJoinMode;
  displayName: string;
  email?: string;
  phone?: string;
  guestsOnSite?: number;
  dietaryNote?: string;
  accessibilityNote?: string;
  roleOrOffice?: string;
  consentAccepted?: boolean;
}

export interface UnionMeetingListFilters {
  unionId: string;
  localId?: string;
}

/** Hub tallies — must match R0 Document Generator RSVP meaning. */
export interface MeetingRsvpTallies {
  quorumCount: number;
  quorumNeeded?: number;
  quorumShortfall: number;
  onSiteYes: number;
  remoteYes: number;
  maybeCount: number;
  noCount: number;
  foodHeads: number;
  responseCount: number;
}

/** Public-safe meeting fields for /r/[token] (no tenant ids). */
export interface PublicRsvpMeeting {
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  publicBlurb?: string;
  hybrid: boolean;
  tokenExpired: boolean;
  tokenRevoked: boolean;
}
