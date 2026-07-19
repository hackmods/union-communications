/**
 * Build a membership / local-event ICS from Document Generator fields.
 * Uses optional calendarStart / calendarEnd (ISO-ish); returns null if unparseable.
 */

import { buildIcsEvent } from "@/lib/calendar/ics";

export type EventIcsFields = {
  title?: string;
  subtitle?: string;
  date?: string;
  time?: string;
  location?: string;
  body?: string;
  contactName?: string;
  calendarStart?: string;
  calendarEnd?: string;
};

function parseFlexibleDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // datetime-local often omits seconds / timezone
  const normalized =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse start/end from form fields. Prefer calendarStart/End; else fail closed. */
export function resolveEventWindow(fields: EventIcsFields): {
  startsAt: string;
  endsAt: string;
} | null {
  const start = parseFlexibleDate(fields.calendarStart ?? "");
  if (!start) return null;
  const endParsed = parseFlexibleDate(fields.calendarEnd ?? "");
  const end =
    endParsed && endParsed.getTime() > start.getTime()
      ? endParsed
      : new Date(start.getTime() + 60 * 60 * 1000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function buildEventIcsContent(
  fields: EventIcsFields,
  opts: { localNumber: string; uid?: string },
): string | null {
  const window = resolveEventWindow(fields);
  if (!window) return null;

  const title = (fields.title ?? "Membership meeting").trim() || "Membership meeting";
  const descriptionParts = [
    fields.subtitle,
    fields.date || fields.time
      ? `Printed notice: ${[fields.date, fields.time].filter(Boolean).join(" · ")}`
      : "",
    fields.body,
    fields.contactName ? `Contact: ${fields.contactName}` : "",
  ].filter(Boolean);

  return buildIcsEvent({
    uid:
      opts.uid ??
      `event-${opts.localNumber}-${window.startsAt}@unionops.local`,
    title,
    description: descriptionParts.join("\n\n") || undefined,
    location: fields.location?.trim() || undefined,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    organizerName: fields.contactName?.trim() || undefined,
  });
}

export function renderEventIcsBlob(
  fields: EventIcsFields,
  opts: { localNumber: string; uid?: string },
): Blob | null {
  const content = buildEventIcsContent(fields, opts);
  if (!content) return null;
  return new Blob([content], { type: "text/calendar;charset=utf-8" });
}
