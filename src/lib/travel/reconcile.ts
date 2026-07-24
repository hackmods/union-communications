import type { ExpenseLineItem } from "@/types/travel";

/** Sum of expense line amounts (absolute, ≥ 0). */
export function sumLineItems(items: ExpenseLineItem[]): number {
  return items.reduce((acc, item) => acc + Math.abs(item.amount), 0);
}

/**
 * Reconcile delta: actual spend − cash advance.
 * Positive → local owes officer more (ledger expense).
 * Negative → unused advance returned (ledger income).
 */
export function reconcileDifference(
  lineItems: ExpenseLineItem[],
  advanceAmount: number,
): number {
  return roundMoney(sumLineItems(lineItems) - Math.abs(advanceAmount));
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function estimatedTotal(costs: {
  travel: number;
  lodging: number;
  meals: number;
  registration: number;
  other: number;
}): number {
  return roundMoney(
    Math.abs(costs.travel) +
      Math.abs(costs.lodging) +
      Math.abs(costs.meals) +
      Math.abs(costs.registration) +
      Math.abs(costs.other),
  );
}
