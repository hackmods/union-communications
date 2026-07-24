import type { TravelAdapter } from "./adapter";
import type {
  CashAdvance,
  CreateExpenseClaimInput,
  CreateTravelAuthorizationInput,
  ExpenseClaim,
  ExpenseLineItem,
  IssueCashAdvanceInput,
  TravelAuthorization,
  TravelListFilters,
  UpdateExpenseClaimInput,
  UpdateTravelAuthorizationInput,
} from "@/types/travel";

const authorizations: TravelAuthorization[] = [];
const advances: CashAdvance[] = [];
const claims: ExpenseClaim[] = [];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function withLineIds(
  items: Omit<ExpenseLineItem, "id">[],
): ExpenseLineItem[] {
  return items.map((item) => ({
    ...item,
    id: id("eli"),
    amount: Math.abs(item.amount),
  }));
}

export class MemoryTravelAdapter implements TravelAdapter {
  async listAuthorizations(
    filters: TravelListFilters,
  ): Promise<TravelAuthorization[]> {
    let results = authorizations.filter((a) => a.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((a) => a.localId === filters.localId);
    }
    if (filters.status) {
      results = results.filter((a) => a.status === filters.status);
    }
    if (filters.requestedById) {
      results = results.filter((a) => a.requestedById === filters.requestedById);
    }
    return [...results].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async getAuthorization(authId: string): Promise<TravelAuthorization | null> {
    return authorizations.find((a) => a.id === authId) ?? null;
  }

  async createAuthorization(
    input: CreateTravelAuthorizationInput,
    meta: {
      unionId: string;
      localId: string;
      requestedById: string;
      requestedByName: string;
    },
  ): Promise<TravelAuthorization> {
    const ts = now();
    const auth: TravelAuthorization = {
      id: id("ta"),
      unionId: meta.unionId,
      localId: meta.localId,
      requestedById: meta.requestedById,
      requestedByName: meta.requestedByName,
      purpose: input.purpose,
      eventName: input.eventName,
      eventStartDate: input.eventStartDate,
      eventEndDate: input.eventEndDate,
      estimatedCosts: {
        travel: Math.abs(input.estimatedCosts.travel),
        lodging: Math.abs(input.estimatedCosts.lodging),
        meals: Math.abs(input.estimatedCosts.meals),
        registration: Math.abs(input.estimatedCosts.registration),
        other: Math.abs(input.estimatedCosts.other),
      },
      status: "requested",
      createdAt: ts,
      updatedAt: ts,
    };
    authorizations.push(auth);
    return auth;
  }

  async updateAuthorization(
    authId: string,
    input: UpdateTravelAuthorizationInput,
  ): Promise<TravelAuthorization | null> {
    const idx = authorizations.findIndex((a) => a.id === authId);
    if (idx < 0) return null;
    const existing = authorizations[idx];
    if (existing.status !== "requested") return null;
    const next: TravelAuthorization = {
      ...existing,
      ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
      ...(input.eventName !== undefined ? { eventName: input.eventName } : {}),
      ...(input.eventStartDate !== undefined
        ? { eventStartDate: input.eventStartDate }
        : {}),
      ...(input.eventEndDate !== undefined
        ? { eventEndDate: input.eventEndDate }
        : {}),
      ...(input.estimatedCosts !== undefined
        ? {
            estimatedCosts: {
              travel: Math.abs(input.estimatedCosts.travel),
              lodging: Math.abs(input.estimatedCosts.lodging),
              meals: Math.abs(input.estimatedCosts.meals),
              registration: Math.abs(input.estimatedCosts.registration),
              other: Math.abs(input.estimatedCosts.other),
            },
          }
        : {}),
      updatedAt: now(),
    };
    authorizations[idx] = next;
    return next;
  }

  async approveAuthorization(
    authId: string,
    approvedById: string,
  ): Promise<TravelAuthorization | null> {
    const idx = authorizations.findIndex((a) => a.id === authId);
    if (idx < 0) return null;
    const existing = authorizations[idx];
    if (existing.status !== "requested") return null;
    const next: TravelAuthorization = {
      ...existing,
      status: "approved",
      approvedById,
      approvedAt: now(),
      deniedReason: undefined,
      updatedAt: now(),
    };
    authorizations[idx] = next;
    return next;
  }

  async denyAuthorization(
    authId: string,
    approvedById: string,
    reason?: string,
  ): Promise<TravelAuthorization | null> {
    const idx = authorizations.findIndex((a) => a.id === authId);
    if (idx < 0) return null;
    const existing = authorizations[idx];
    if (existing.status !== "requested") return null;
    const next: TravelAuthorization = {
      ...existing,
      status: "denied",
      approvedById,
      approvedAt: now(),
      deniedReason: reason,
      updatedAt: now(),
    };
    authorizations[idx] = next;
    return next;
  }

  async removeAuthorization(authId: string): Promise<boolean> {
    const idx = authorizations.findIndex((a) => a.id === authId);
    if (idx < 0) return false;
    const auth = authorizations[idx];
    if (auth.status === "approved") return false;
    authorizations.splice(idx, 1);
    for (let i = advances.length - 1; i >= 0; i--) {
      if (advances[i].travelAuthorizationId === authId) advances.splice(i, 1);
    }
    for (let i = claims.length - 1; i >= 0; i--) {
      if (claims[i].travelAuthorizationId === authId) claims.splice(i, 1);
    }
    return true;
  }

  async getAdvanceForAuth(
    travelAuthorizationId: string,
  ): Promise<CashAdvance | null> {
    return (
      advances.find((a) => a.travelAuthorizationId === travelAuthorizationId) ??
      null
    );
  }

  async issueAdvance(
    travelAuthorizationId: string,
    input: IssueCashAdvanceInput,
    meta: {
      unionId: string;
      localId: string;
      issuedById: string;
      ledgerEntryId: string;
    },
  ): Promise<CashAdvance> {
    const existing = await this.getAdvanceForAuth(travelAuthorizationId);
    if (existing) {
      throw new Error("Advance already issued");
    }
    const advance: CashAdvance = {
      id: id("adv"),
      travelAuthorizationId,
      unionId: meta.unionId,
      localId: meta.localId,
      amount: Math.abs(input.amount),
      issuedAt: now(),
      issuedById: meta.issuedById,
      ledgerEntryId: meta.ledgerEntryId,
    };
    advances.push(advance);
    return advance;
  }

  async getClaimForAuth(
    travelAuthorizationId: string,
  ): Promise<ExpenseClaim | null> {
    return (
      claims.find((c) => c.travelAuthorizationId === travelAuthorizationId) ??
      null
    );
  }

  async getClaimById(claimId: string): Promise<ExpenseClaim | null> {
    return claims.find((c) => c.id === claimId) ?? null;
  }

  async createClaim(
    input: CreateExpenseClaimInput,
    meta: {
      unionId: string;
      localId: string;
      claimantId: string;
      advanceAmount: number;
    },
  ): Promise<ExpenseClaim> {
    const existing = await this.getClaimForAuth(input.travelAuthorizationId);
    if (existing) {
      throw new Error("Claim already exists for this authorization");
    }
    const ts = now();
    const claim: ExpenseClaim = {
      id: id("exp"),
      travelAuthorizationId: input.travelAuthorizationId,
      unionId: meta.unionId,
      localId: meta.localId,
      claimantId: meta.claimantId,
      status: "draft",
      lineItems: withLineIds(input.lineItems),
      advanceAmount: Math.abs(meta.advanceAmount),
      createdAt: ts,
      updatedAt: ts,
    };
    claims.push(claim);
    return claim;
  }

  async updateClaim(
    claimId: string,
    input: UpdateExpenseClaimInput,
  ): Promise<ExpenseClaim | null> {
    const idx = claims.findIndex((c) => c.id === claimId);
    if (idx < 0) return null;
    const existing = claims[idx];
    if (existing.status === "reconciled") return null;
    const next: ExpenseClaim = {
      ...existing,
      ...(input.lineItems !== undefined
        ? { lineItems: withLineIds(input.lineItems) }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: now(),
    };
    claims[idx] = next;
    return next;
  }

  async reconcileClaim(
    claimId: string,
    meta: {
      reconciledById: string;
      difference: number;
      reconcileLedgerEntryId?: string;
    },
  ): Promise<ExpenseClaim | null> {
    const idx = claims.findIndex((c) => c.id === claimId);
    if (idx < 0) return null;
    const existing = claims[idx];
    if (existing.status === "reconciled") return null;
    const next: ExpenseClaim = {
      ...existing,
      status: "reconciled",
      difference: meta.difference,
      reconciledAt: now(),
      reconciledById: meta.reconciledById,
      reconcileLedgerEntryId: meta.reconcileLedgerEntryId,
      updatedAt: now(),
    };
    claims[idx] = next;
    return next;
  }
}

export const memoryTravelStore: TravelAdapter = new MemoryTravelAdapter();

/** @internal test helper */
export function resetMemoryTravelStore(): void {
  authorizations.length = 0;
  advances.length = 0;
  claims.length = 0;
}
