import { ledgerDbBackend } from "@/lib/db/backend";
import type { LedgerAdapter } from "./adapter";
import { DrizzleLedgerAdapter } from "./drizzle-adapter";
import { memoryLedgerStore } from "./memory-adapter";

let store: LedgerAdapter | null = null;

/** Singleton ledger store — memory by default; Postgres when flagged. */
export function getLedgerStore(): LedgerAdapter {
  if (!store) {
    store =
      ledgerDbBackend() === "postgres"
        ? new DrizzleLedgerAdapter()
        : memoryLedgerStore;
  }
  return store;
}

/** @internal test helper */
export function resetLedgerStore(): void {
  store = null;
}

export const ledgerStore: LedgerAdapter = new Proxy({} as LedgerAdapter, {
  get(_target, prop, receiver) {
    const impl = getLedgerStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
