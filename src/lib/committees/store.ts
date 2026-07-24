import { committeesDbBackend } from "@/lib/db/backend";
import type { CommitteesAdapter } from "./adapter";
import { DrizzleCommitteesAdapter } from "./drizzle-adapter";
import { memoryCommitteesStore } from "./memory-adapter";

let store: CommitteesAdapter | null = null;

/** Singleton committees store — memory by default; Postgres when flagged. */
export function getCommitteesStore(): CommitteesAdapter {
  if (!store) {
    store =
      committeesDbBackend() === "postgres"
        ? new DrizzleCommitteesAdapter()
        : memoryCommitteesStore;
  }
  return store;
}

/** @internal test helper */
export function resetCommitteesStore(): void {
  store = null;
}

export const committeesStore: CommitteesAdapter = new Proxy(
  {} as CommitteesAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getCommitteesStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
