import { expensesDbBackend } from "@/lib/db/backend";
import type { ExpenseAdapter } from "./adapter";
import { DrizzleExpenseAdapter } from "./drizzle-adapter";
import { memoryExpenseStore } from "./memory-adapter";

let store: ExpenseAdapter | null = null;

export function getExpenseStore(): ExpenseAdapter {
  if (!store) {
    store =
      expensesDbBackend() === "postgres"
        ? new DrizzleExpenseAdapter()
        : memoryExpenseStore;
  }
  return store;
}

/** @internal test helper */
export function resetExpenseStore(): void {
  store = null;
}

export const expenseStore: ExpenseAdapter = new Proxy({} as ExpenseAdapter, {
  get(_target, prop, receiver) {
    const impl = getExpenseStore();
    const value = Reflect.get(impl, prop, receiver);
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
