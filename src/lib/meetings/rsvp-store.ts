import { meetingsRsvpDbBackend } from "@/lib/db/backend";
import type { MeetingsRsvpAdapter } from "./rsvp-adapter";
import { DrizzleMeetingsRsvpAdapter } from "./rsvp-drizzle-adapter";
import { memoryMeetingsRsvpStore } from "./rsvp-memory-adapter";

let store: MeetingsRsvpAdapter | null = null;

/**
 * Singleton RSVP store — memory by default;
 * Postgres when MEETINGS_RSVP_DB_BACKEND=postgres.
 */
export function getMeetingsRsvpStore(): MeetingsRsvpAdapter {
  if (!store) {
    store =
      meetingsRsvpDbBackend() === "postgres"
        ? new DrizzleMeetingsRsvpAdapter()
        : memoryMeetingsRsvpStore;
  }
  return store;
}

/** @internal test helper */
export function resetMeetingsRsvpStore(): void {
  store = null;
}

export const meetingsRsvpStore: MeetingsRsvpAdapter = new Proxy(
  {} as MeetingsRsvpAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getMeetingsRsvpStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
