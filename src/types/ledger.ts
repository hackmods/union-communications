/** ORG-006 — Local discretionary fund ledger (not dues/ERP). */

export type LedgerEntryType = "income" | "expense";

export interface LedgerEntry {
  id: string;
  unionId: string;
  localId: string;
  /** ISO date (YYYY-MM-DD) or datetime string. */
  date: string;
  description: string;
  /** Absolute amount in local currency units (always ≥ 0). Sign via `type`. */
  amount: number;
  type: LedgerEntryType;
  category: string;
  recordedById: string;
}

export interface CreateLedgerEntryInput {
  date: string;
  description: string;
  amount: number;
  type: LedgerEntryType;
  category: string;
}

export interface UpdateLedgerEntryInput {
  date?: string;
  description?: string;
  amount?: number;
  type?: LedgerEntryType;
  category?: string;
}

export interface LedgerListFilters {
  unionId: string;
  localId?: string;
  type?: LedgerEntryType;
  category?: string;
  from?: string;
  to?: string;
}
