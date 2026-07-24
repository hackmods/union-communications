/** ORG-008 — Travel authorization, cash advance, expense reconcile (not ERP/SAP). */

export type TravelAuthStatus = "requested" | "approved" | "denied";

export type ExpenseClaimStatus = "draft" | "submitted" | "reconciled";

export interface EstimatedCosts {
  travel: number;
  lodging: number;
  meals: number;
  registration: number;
  other: number;
}

export interface TravelAuthorization {
  id: string;
  unionId: string;
  localId: string;
  requestedById: string;
  requestedByName: string;
  purpose: string;
  eventName: string;
  /** ISO date YYYY-MM-DD */
  eventStartDate: string;
  /** ISO date YYYY-MM-DD */
  eventEndDate: string;
  estimatedCosts: EstimatedCosts;
  status: TravelAuthStatus;
  approvedById?: string;
  approvedAt?: string;
  deniedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashAdvance {
  id: string;
  travelAuthorizationId: string;
  unionId: string;
  localId: string;
  amount: number;
  issuedAt: string;
  issuedById: string;
  /** Ledger expense row posted when the advance left the fund. */
  ledgerEntryId: string;
}

export interface ExpenseLineItem {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

export interface ExpenseClaim {
  id: string;
  travelAuthorizationId: string;
  unionId: string;
  localId: string;
  claimantId: string;
  status: ExpenseClaimStatus;
  lineItems: ExpenseLineItem[];
  /** Snapshot of cash advance at reconcile time (0 if none). */
  advanceAmount: number;
  /**
   * sum(lineItems) − advanceAmount.
   * Positive → spent more than advance (local owes officer) → ledger expense.
   * Negative → unused advance returned (officer owes local) → ledger income.
   */
  difference?: number;
  reconciledAt?: string;
  reconciledById?: string;
  reconcileLedgerEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTravelAuthorizationInput {
  purpose: string;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  estimatedCosts: EstimatedCosts;
}

export interface UpdateTravelAuthorizationInput {
  purpose?: string;
  eventName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  estimatedCosts?: EstimatedCosts;
}

export interface CreateExpenseClaimInput {
  travelAuthorizationId: string;
  lineItems: Omit<ExpenseLineItem, "id">[];
}

export interface UpdateExpenseClaimInput {
  lineItems?: Omit<ExpenseLineItem, "id">[];
  status?: "draft" | "submitted";
}

export interface IssueCashAdvanceInput {
  amount: number;
}

export interface TravelListFilters {
  unionId: string;
  localId?: string;
  status?: TravelAuthStatus;
  requestedById?: string;
}
