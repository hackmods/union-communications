import { minutesDbBackend } from "@/lib/db/backend";
import type { MinutesAdapter } from "./adapter";
import { DrizzleMinutesAdapter } from "./drizzle-adapter";
import { memoryMinutesStore } from "./memory-adapter";

let store: MinutesAdapter | null = null;

/** Singleton minutes store — memory by default; Postgres when flagged. */
export function getMinutesStore(): MinutesAdapter {
  if (!store) {
    store =
      minutesDbBackend() === "postgres"
        ? new DrizzleMinutesAdapter()
        : memoryMinutesStore;
  }
  return store;
}

/** @internal test helper */
export function resetMinutesStore(): void {
  store = null;
}

export const minutesStore: MinutesAdapter = new Proxy({} as MinutesAdapter, {
  get(_target, prop, receiver) {
    const impl = getMinutesStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
