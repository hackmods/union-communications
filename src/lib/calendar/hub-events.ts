/**
 * Shared Hub calendar event shape + pure helpers (safe for client + server).
 */

import type { IcsEventInput } from "@/lib/calendar/ics";

export type HubCalendarEventKind = "grievance_meeting" | "bumping_session";

export interface HubCalendarEvent {
  id: string;
  kind: HubCalendarEventKind;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  description?: string;
  unionId: string;
  localId: string;
  /** Deep link into the parent grievance or bumping case. */
  href: string;
  /** Parent case id for display / audit. */
  parentId: string;
}

/** Committee sessions store a date-only string; expand to a 1-hour window at 16:00 UTC. */
export function sessionDateToWindow(date: string): {
  startsAt: string;
  endsAt: string;
} {
  const day = date.slice(0, 10);
  const startsAt = `${day}T16:00:00.000Z`;
  const endsAt = `${day}T17:00:00.000Z`;
  return { startsAt, endsAt };
}

export function hubEventsToIcsInputs(
  events: HubCalendarEvent[],
): IcsEventInput[] {
  return events.map((e) => ({
    uid: `hub-cal-${e.kind}-${e.id}@unionops.local`,
    title: e.title,
    description: e.description,
    location: e.location,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
  }));
}
