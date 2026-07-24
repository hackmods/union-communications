import type { LedgerEntry } from "@/types/ledger";

export interface LedgerEntryWithBalance extends LedgerEntry {
  runningBalance: number;
}

/** Signed delta for an entry (income +, expense −). */
export function entryDelta(entry: Pick<LedgerEntry, "type" | "amount">): number {
  const amount = Math.abs(entry.amount);
  return entry.type === "income" ? amount : -amount;
}

/**
 * Sort chronologically and attach a running balance after each row.
 * Stable tie-break on id when dates match.
 */
export function withRunningBalance(
  entries: LedgerEntry[],
): LedgerEntryWithBalance[] {
  const sorted = [...entries].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
  let balance = 0;
  return sorted.map((entry) => {
    balance += entryDelta(entry);
    return { ...entry, runningBalance: balance };
  });
}
