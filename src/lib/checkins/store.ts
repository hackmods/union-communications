import { checkinsDbBackend } from "@/lib/db/backend";
import type { CheckinsAdapter } from "./adapter";
import { DrizzleCheckinsAdapter } from "./drizzle-adapter";
import { memoryCheckinsStore } from "./memory-adapter";

let store: CheckinsAdapter | null = null;

/** Singleton check-ins store — memory by default; Postgres when flagged. */
export function getCheckinsStore(): CheckinsAdapter {
  if (!store) {
    store =
      checkinsDbBackend() === "postgres"
        ? new DrizzleCheckinsAdapter()
        : memoryCheckinsStore;
  }
  return store;
}

/** @internal test helper */
export function resetCheckinsStore(): void {
  store = null;
}

export const checkinsStore: CheckinsAdapter = new Proxy(
  {} as CheckinsAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getCheckinsStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
