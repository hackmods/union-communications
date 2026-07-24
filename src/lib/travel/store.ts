import { travelDbBackend } from "@/lib/db/backend";
import type { TravelAdapter } from "./adapter";
import { DrizzleTravelAdapter } from "./drizzle-adapter";
import { memoryTravelStore } from "./memory-adapter";

let store: TravelAdapter | null = null;

/** Singleton travel store — memory by default; Postgres when flagged. */
export function getTravelStore(): TravelAdapter {
  if (!store) {
    store =
      travelDbBackend() === "postgres"
        ? new DrizzleTravelAdapter()
        : memoryTravelStore;
  }
  return store;
}

/** @internal test helper */
export function resetTravelStore(): void {
  store = null;
}

export const travelStore: TravelAdapter = new Proxy({} as TravelAdapter, {
  get(_target, prop, receiver) {
    const impl = getTravelStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
