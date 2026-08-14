import type { EventEmailFields } from "@/lib/comms/event-email";

/** Map Flyer Maker editor fields → shared RSVP invite email builder. */
export function fieldsFromFlyer(s: {
  message: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  body?: string;
}): EventEmailFields {
  return {
    title: s.message,
    subtitle: s.body?.trim() || undefined,
    date: s.date,
    time: s.time,
    location: s.location,
    contactName: s.contact,
  };
}
