import { timeDbBackend } from "@/lib/db/backend";
import type { TimeAdapter } from "./adapter";
import { DrizzleTimeAdapter } from "./drizzle-adapter";
import { memoryTimeStore } from "./memory-adapter";

let store: TimeAdapter | null = null;

/** Singleton time store — memory by default; Postgres when flagged. */
export function getTimeStore(): TimeAdapter {
  if (!store) {
    store =
      timeDbBackend() === "postgres"
        ? new DrizzleTimeAdapter()
        : memoryTimeStore;
  }
  return store;
}

/** @internal test helper */
export function resetTimeStore(): void {
  store = null;
}

export const timeStore: TimeAdapter = new Proxy({} as TimeAdapter, {
  get(_target, prop, receiver) {
    const impl = getTimeStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
