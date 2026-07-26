import type { ExpenseLineItem } from "@/types/expenses";

/** Sum of expense line amounts (absolute, ≥ 0). */
export function sumLineItems(items: ExpenseLineItem[]): number {
  return items.reduce((sum, item) => sum + Math.abs(item.amount), 0);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
