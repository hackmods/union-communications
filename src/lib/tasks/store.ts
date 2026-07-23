import { tasksDbBackend } from "@/lib/db/backend";
import type { TaskAdapter } from "./adapter";
import { DrizzleTaskAdapter } from "./drizzle-adapter";
import { memoryTaskStore } from "./memory-adapter";

let store: TaskAdapter | null = null;

/** Singleton task store — memory by default; Postgres when flagged. */
export function getTaskStore(): TaskAdapter {
  if (!store) {
    store =
      tasksDbBackend() === "postgres"
        ? new DrizzleTaskAdapter()
        : memoryTaskStore;
  }
  return store;
}

/** @internal test helper */
export function resetTaskStore(): void {
  store = null;
}

export const taskStore: TaskAdapter = new Proxy({} as TaskAdapter, {
  get(_target, prop, receiver) {
    const impl = getTaskStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
