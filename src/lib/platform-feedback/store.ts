import { feedbackDbBackend } from "@/lib/db/backend";
import type { PlatformFeedbackAdapter } from "./adapter";
import { DrizzlePlatformFeedbackAdapter } from "./drizzle-adapter";
import { memoryPlatformFeedbackStore } from "./memory-adapter";

let store: PlatformFeedbackAdapter | null = null;

/** Singleton — memory by default; Postgres when FEEDBACK_DB_BACKEND=postgres. */
export function getPlatformFeedbackStore(): PlatformFeedbackAdapter {
  if (!store) {
    store =
      feedbackDbBackend() === "postgres"
        ? new DrizzlePlatformFeedbackAdapter()
        : memoryPlatformFeedbackStore;
  }
  return store;
}

/** @internal test helper */
export function resetPlatformFeedbackStore(): void {
  store = null;
}

export const platformFeedbackStore: PlatformFeedbackAdapter = new Proxy(
  {} as PlatformFeedbackAdapter,
  {
    get(_target, prop, receiver) {
      const impl = getPlatformFeedbackStore();
      const value = Reflect.get(impl, prop, receiver);
      return typeof value === "function" ? value.bind(impl) : value;
    },
  },
);
