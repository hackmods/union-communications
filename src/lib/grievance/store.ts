import { grievanceDbBackend } from "@/lib/db/backend";
import type { GrievanceAdapter } from "./adapter";
import { DrizzleGrievanceAdapter } from "./drizzle-adapter";
import { MemoryGrievanceAdapter } from "./memory-adapter";

let store: GrievanceAdapter | null = null;

/** Singleton grievance store — memory by default; Postgres when flagged. */
export function getGrievanceStore(): GrievanceAdapter {
  if (!store) {
    store =
      grievanceDbBackend() === "postgres"
        ? new DrizzleGrievanceAdapter()
        : new MemoryGrievanceAdapter();
  }
  return store;
}

/** @internal test helper */
export function resetGrievanceStore(): void {
  store = null;
}

export const grievanceStore: GrievanceAdapter = new Proxy({} as GrievanceAdapter, {
  get(_target, prop, receiver) {
    const impl = getGrievanceStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
