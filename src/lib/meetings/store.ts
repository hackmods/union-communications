import { meetingsDbBackend } from "@/lib/db/backend";
import { withTenantRlsScope } from "@/lib/db/rls-store";
import type { MeetingsAdapter } from "./adapter";
import { DrizzleMeetingsAdapter } from "./drizzle-adapter";
import { MemoryMeetingsAdapter } from "./memory-adapter";

let store: MeetingsAdapter | null = null;

export function getMeetingsStore(): MeetingsAdapter {
  if (!store) {
    store =
      meetingsDbBackend() === "postgres"
        ? withTenantRlsScope(new DrizzleMeetingsAdapter())
        : new MemoryMeetingsAdapter();
  }
  return store;
}

export const meetingsStore: MeetingsAdapter = new Proxy({} as MeetingsAdapter, {
  get(_target, prop, receiver) {
    const impl = getMeetingsStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
