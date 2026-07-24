import { pollsDbBackend } from "@/lib/db/backend";
import type { PollsAdapter } from "./adapter";
import { DrizzlePollsAdapter } from "./drizzle-adapter";
import { memoryPollsStore } from "./memory-adapter";

let store: PollsAdapter | null = null;

/** Singleton polls store — memory by default; Postgres when POLLS_DB_BACKEND=postgres. */
export function getPollsStore(): PollsAdapter {
  if (!store) {
    store =
      pollsDbBackend() === "postgres"
        ? new DrizzlePollsAdapter()
        : memoryPollsStore;
  }
  return store;
}

/** @internal test helper */
export function resetPollsStore(): void {
  store = null;
}

export const pollsStore: PollsAdapter = new Proxy({} as PollsAdapter, {
  get(_target, prop, receiver) {
    const impl = getPollsStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
