/** ORG-009 — Union business & purchase expense submissions (not travel TAR). */

export type ExpenseSubmissionStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "denied";

export type ExpensePurchaseCategory =
  | "supplies"
  | "meeting"
  | "printing"
  | "solidarity"
  | "postage"
  | "other";

export interface ExpenseLineItem {
  id: string;
  date: string;
  category: ExpensePurchaseCategory | string;
  amount: number;
  description: string;
}

export interface ExpenseSubmission {
  id: string;
  unionId: string;
  localId: string;
  submittedById: string;
  submittedByName: string;
  title: string;
  purpose: string;
  status: ExpenseSubmissionStatus;
  lineItems: ExpenseLineItem[];
  /** Cached sum of line items (≥ 0). */
  totalAmount: number;
  approvedById?: string;
  approvedAt?: string;
  deniedReason?: string;
  /** Ledger expense row posted when treasurer approves reimbursement. */
  ledgerEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseSubmissionInput {
  title: string;
  purpose: string;
  lineItems: Omit<ExpenseLineItem, "id">[];
}

export interface UpdateExpenseSubmissionInput {
  title?: string;
  purpose?: string;
  lineItems?: Omit<ExpenseLineItem, "id">[];
  status?: "draft" | "submitted";
}

export interface DenyExpenseSubmissionInput {
  reason?: string;
}

export interface ExpenseListFilters {
  unionId: string;
  localId?: string;
  status?: ExpenseSubmissionStatus;
  submittedById?: string;
}
