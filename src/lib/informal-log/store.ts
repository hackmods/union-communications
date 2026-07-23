import { informalLogDbBackend } from "@/lib/db/backend";
import type { InformalLogAdapter } from "./adapter";
import { DrizzleInformalLogAdapter } from "./drizzle-adapter";
import { memoryInformalLogStore } from "./memory-adapter";

let store: InformalLogAdapter | null = null;

/** Singleton informal-log store — memory by default; Postgres when flagged. */
export function getInformalLogStore(): InformalLogAdapter {
  if (!store) {
    store =
      informalLogDbBackend() === "postgres"
        ? new DrizzleInformalLogAdapter()
        : memoryInformalLogStore;
  }
  return store;
}

/** @internal test helper */
export function resetInformalLogStore(): void {
  store = null;
}

export const informalLogStore: InformalLogAdapter = new Proxy(
  {} as InformalLogAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getInformalLogStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
