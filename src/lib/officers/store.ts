import { officersDbBackend } from "@/lib/db/backend";
import type { OfficerRosterAdapter } from "./adapter";
import { DrizzleOfficerRosterAdapter } from "./drizzle-adapter";
import { memoryOfficerRosterStore } from "./memory-adapter";

let store: OfficerRosterAdapter | null = null;

/** Singleton officer roster store — memory by default; Postgres when flagged. */
export function getOfficerRosterStore(): OfficerRosterAdapter {
  if (!store) {
    store =
      officersDbBackend() === "postgres"
        ? new DrizzleOfficerRosterAdapter()
        : memoryOfficerRosterStore;
  }
  return store;
}

/** @internal test helper */
export function resetOfficerRosterStore(): void {
  store = null;
}

export const officerRosterStore: OfficerRosterAdapter = new Proxy(
  {} as OfficerRosterAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getOfficerRosterStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
