import type { EventEmailFields } from "@/lib/comms/event-email";

/** Map Board Notice editor fields → shared RSVP invite email builder. */
export function fieldsFromBoardNotice(s: {
  headline: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  quorumNeeded?: string;
}): EventEmailFields {
  return {
    title: s.headline,
    date: s.date,
    time: s.time,
    location: s.location,
    contactName: s.contact,
    quorumNeeded: s.quorumNeeded,
  };
}
