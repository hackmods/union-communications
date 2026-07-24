import { electionsDbBackend } from "@/lib/db/backend";
import type { ElectionsAdapter } from "./adapter";
import { DrizzleElectionsAdapter } from "./drizzle-adapter";
import { memoryElectionsStore } from "./memory-adapter";

let store: ElectionsAdapter | null = null;

/** Singleton elections store — memory by default; Postgres when flagged. */
export function getElectionsStore(): ElectionsAdapter {
  if (!store) {
    store =
      electionsDbBackend() === "postgres"
        ? new DrizzleElectionsAdapter()
        : memoryElectionsStore;
  }
  return store;
}

/** @internal test helper */
export function resetElectionsStore(): void {
  store = null;
}

export const electionsStore: ElectionsAdapter = new Proxy(
  {} as ElectionsAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getElectionsStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
