import { officerLearningDbBackend } from "@/lib/db/backend";
import type { OfficerLearningAdapter } from "./adapter";
import { DrizzleOfficerLearningAdapter } from "./drizzle-adapter";
import { memoryOfficerLearningStore } from "./memory-adapter";

let store: OfficerLearningAdapter | null = null;

export function getOfficerLearningStore(): OfficerLearningAdapter {
  if (!store) {
    store =
      officerLearningDbBackend() === "postgres"
        ? new DrizzleOfficerLearningAdapter()
        : memoryOfficerLearningStore;
  }
  return store;
}

/** @internal test helper */
export function resetOfficerLearningStoreSingleton(): void {
  store = null;
}

export const officerLearningStore: OfficerLearningAdapter = new Proxy(
  {} as OfficerLearningAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getOfficerLearningStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
