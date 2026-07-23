import { discussionsDbBackend } from "@/lib/db/backend";
import type { DiscussionsAdapter } from "./adapter";
import { DrizzleDiscussionsAdapter } from "./drizzle-adapter";
import { memoryDiscussionsStore } from "./memory-adapter";

let store: DiscussionsAdapter | null = null;

/** Singleton discussions store — memory by default; Postgres when flagged. */
export function getDiscussionsStore(): DiscussionsAdapter {
  if (!store) {
    store =
      discussionsDbBackend() === "postgres"
        ? new DrizzleDiscussionsAdapter()
        : memoryDiscussionsStore;
  }
  return store;
}

/** @internal test helper */
export function resetDiscussionsStore(): void {
  store = null;
}

export const discussionsStore: DiscussionsAdapter = new Proxy(
  {} as DiscussionsAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getDiscussionsStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
