import { bumpingDbBackend } from "@/lib/db/backend";
import type { BumpingAdapter } from "./adapter";
import { DrizzleBumpingAdapter } from "./drizzle-adapter";
import { MemoryBumpingAdapter } from "./memory-adapter";

let store: BumpingAdapter | null = null;

export function getBumpingStore(): BumpingAdapter {
  if (!store) {
    store =
      bumpingDbBackend() === "postgres"
        ? new DrizzleBumpingAdapter()
        : new MemoryBumpingAdapter();
  }
  return store;
}

/** @internal test helper */
export function resetBumpingStore(): void {
  store = null;
}

export const bumpingStore: BumpingAdapter = new Proxy({} as BumpingAdapter, {
  get(_target, prop, receiver) {
    const impl = getBumpingStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
