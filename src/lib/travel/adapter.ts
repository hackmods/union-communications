import type {
  CashAdvance,
  CreateExpenseClaimInput,
  CreateTravelAuthorizationInput,
  ExpenseClaim,
  IssueCashAdvanceInput,
  TravelAuthorization,
  TravelListFilters,
  UpdateExpenseClaimInput,
  UpdateTravelAuthorizationInput,
} from "@/types/travel";

export interface TravelAdapter {
  listAuthorizations(
    filters: TravelListFilters,
  ): Promise<TravelAuthorization[]>;
  getAuthorization(id: string): Promise<TravelAuthorization | null>;
  createAuthorization(
    input: CreateTravelAuthorizationInput,
    meta: {
      unionId: string;
      localId: string;
      requestedById: string;
      requestedByName: string;
    },
  ): Promise<TravelAuthorization>;
  updateAuthorization(
    id: string,
    input: UpdateTravelAuthorizationInput,
  ): Promise<TravelAuthorization | null>;
  approveAuthorization(
    id: string,
    approvedById: string,
  ): Promise<TravelAuthorization | null>;
  denyAuthorization(
    id: string,
    approvedById: string,
    reason?: string,
  ): Promise<TravelAuthorization | null>;
  removeAuthorization(id: string): Promise<boolean>;

  getAdvanceForAuth(travelAuthorizationId: string): Promise<CashAdvance | null>;
  issueAdvance(
    travelAuthorizationId: string,
    input: IssueCashAdvanceInput,
    meta: {
      unionId: string;
      localId: string;
      issuedById: string;
      ledgerEntryId: string;
    },
  ): Promise<CashAdvance>;

  getClaimForAuth(travelAuthorizationId: string): Promise<ExpenseClaim | null>;
  getClaimById(id: string): Promise<ExpenseClaim | null>;
  createClaim(
    input: CreateExpenseClaimInput,
    meta: {
      unionId: string;
      localId: string;
      claimantId: string;
      advanceAmount: number;
    },
  ): Promise<ExpenseClaim>;
  updateClaim(
    id: string,
    input: UpdateExpenseClaimInput,
  ): Promise<ExpenseClaim | null>;
  reconcileClaim(
    id: string,
    meta: {
      reconciledById: string;
      difference: number;
      reconcileLedgerEntryId?: string;
    },
  ): Promise<ExpenseClaim | null>;
}
