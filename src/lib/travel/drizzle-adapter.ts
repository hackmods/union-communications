import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  cashAdvances,
  expenseClaims,
  travelAuthorizations,
} from "@/lib/db/schema/travel";
import type { TravelAdapter } from "./adapter";
import type {
  CashAdvance,
  CreateExpenseClaimInput,
  CreateTravelAuthorizationInput,
  ExpenseClaim,
  ExpenseLineItem,
  IssueCashAdvanceInput,
  TravelAuthorization,
  TravelAuthStatus,
  TravelListFilters,
  UpdateExpenseClaimInput,
  UpdateTravelAuthorizationInput,
  ExpenseClaimStatus,
  EstimatedCosts,
} from "@/types/travel";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function withLineIds(
  items: Omit<ExpenseLineItem, "id">[],
): ExpenseLineItem[] {
  return items.map((item) => ({
    ...item,
    id: newId("eli"),
    amount: Math.abs(item.amount),
  }));
}

function mapAuth(
  row: typeof travelAuthorizations.$inferSelect,
): TravelAuthorization {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    requestedById: row.requestedById,
    requestedByName: row.requestedByName,
    purpose: row.purpose,
    eventName: row.eventName,
    eventStartDate: row.eventStartDate,
    eventEndDate: row.eventEndDate,
    estimatedCosts: row.estimatedCosts as EstimatedCosts,
    status: row.status as TravelAuthStatus,
    approvedById: row.approvedById ?? undefined,
    approvedAt: row.approvedAt?.toISOString(),
    deniedReason: row.deniedReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAdvance(row: typeof cashAdvances.$inferSelect): CashAdvance {
  return {
    id: row.id,
    travelAuthorizationId: row.travelAuthorizationId,
    unionId: row.unionId,
    localId: row.localId,
    amount: row.amount,
    issuedAt: row.issuedAt.toISOString(),
    issuedById: row.issuedById,
    ledgerEntryId: row.ledgerEntryId,
  };
}

function mapClaim(row: typeof expenseClaims.$inferSelect): ExpenseClaim {
  return {
    id: row.id,
    travelAuthorizationId: row.travelAuthorizationId,
    unionId: row.unionId,
    localId: row.localId,
    claimantId: row.claimantId,
    status: row.status as ExpenseClaimStatus,
    lineItems: (row.lineItems as ExpenseLineItem[]) ?? [],
    advanceAmount: row.advanceAmount,
    difference: row.difference ?? undefined,
    reconciledAt: row.reconciledAt?.toISOString(),
    reconciledById: row.reconciledById ?? undefined,
    reconcileLedgerEntryId: row.reconcileLedgerEntryId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DrizzleTravelAdapter implements TravelAdapter {
  async listAuthorizations(
    filters: TravelListFilters,
  ): Promise<TravelAuthorization[]> {
    const db = getDb();
    const conditions = [eq(travelAuthorizations.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(travelAuthorizations.localId, filters.localId));
    }
    if (filters.status) {
      conditions.push(eq(travelAuthorizations.status, filters.status));
    }
    if (filters.requestedById) {
      conditions.push(
        eq(travelAuthorizations.requestedById, filters.requestedById),
      );
    }
    const rows = await db
      .select()
      .from(travelAuthorizations)
      .where(and(...conditions));
    return rows
      .map(mapAuth)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAuthorization(id: string): Promise<TravelAuthorization | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(travelAuthorizations)
      .where(eq(travelAuthorizations.id, id))
      .limit(1);
    return rows[0] ? mapAuth(rows[0]) : null;
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
    const db = getDb();
    const row = {
      id: newId("ta"),
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
    };
    await db.insert(travelAuthorizations).values(row);
    const created = await this.getAuthorization(row.id);
    if (!created) throw new Error("Failed to create travel authorization");
    return created;
  }

  async updateAuthorization(
    id: string,
    input: UpdateTravelAuthorizationInput,
  ): Promise<TravelAuthorization | null> {
    const existing = await this.getAuthorization(id);
    if (!existing || existing.status !== "requested") return null;
    const db = getDb();
    await db
      .update(travelAuthorizations)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(travelAuthorizations.id, id));
    return this.getAuthorization(id);
  }

  async approveAuthorization(
    id: string,
    approvedById: string,
  ): Promise<TravelAuthorization | null> {
    const existing = await this.getAuthorization(id);
    if (!existing || existing.status !== "requested") return null;
    const db = getDb();
    await db
      .update(travelAuthorizations)
      .set({
        status: "approved",
        approvedById,
        approvedAt: new Date(),
        deniedReason: null,
        updatedAt: new Date(),
      })
      .where(eq(travelAuthorizations.id, id));
    return this.getAuthorization(id);
  }

  async denyAuthorization(
    id: string,
    approvedById: string,
    reason?: string,
  ): Promise<TravelAuthorization | null> {
    const existing = await this.getAuthorization(id);
    if (!existing || existing.status !== "requested") return null;
    const db = getDb();
    await db
      .update(travelAuthorizations)
      .set({
        status: "denied",
        approvedById,
        approvedAt: new Date(),
        deniedReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(travelAuthorizations.id, id));
    return this.getAuthorization(id);
  }

  async removeAuthorization(id: string): Promise<boolean> {
    const existing = await this.getAuthorization(id);
    if (!existing || existing.status === "approved") return false;
    const db = getDb();
    await db
      .delete(travelAuthorizations)
      .where(eq(travelAuthorizations.id, id));
    return true;
  }

  async getAdvanceForAuth(
    travelAuthorizationId: string,
  ): Promise<CashAdvance | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(cashAdvances)
      .where(eq(cashAdvances.travelAuthorizationId, travelAuthorizationId))
      .limit(1);
    return rows[0] ? mapAdvance(rows[0]) : null;
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
    if (existing) throw new Error("Advance already issued");
    const db = getDb();
    const row = {
      id: newId("adv"),
      travelAuthorizationId,
      unionId: meta.unionId,
      localId: meta.localId,
      amount: Math.abs(input.amount),
      issuedAt: new Date(),
      issuedById: meta.issuedById,
      ledgerEntryId: meta.ledgerEntryId,
    };
    await db.insert(cashAdvances).values(row);
    return mapAdvance({ ...row, issuedAt: row.issuedAt });
  }

  async getClaimForAuth(
    travelAuthorizationId: string,
  ): Promise<ExpenseClaim | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(expenseClaims)
      .where(eq(expenseClaims.travelAuthorizationId, travelAuthorizationId))
      .limit(1);
    return rows[0] ? mapClaim(rows[0]) : null;
  }

  async getClaimById(id: string): Promise<ExpenseClaim | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(expenseClaims)
      .where(eq(expenseClaims.id, id))
      .limit(1);
    return rows[0] ? mapClaim(rows[0]) : null;
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
    if (existing) throw new Error("Claim already exists for this authorization");
    const db = getDb();
    const row = {
      id: newId("exp"),
      travelAuthorizationId: input.travelAuthorizationId,
      unionId: meta.unionId,
      localId: meta.localId,
      claimantId: meta.claimantId,
      status: "draft",
      lineItems: withLineIds(input.lineItems),
      advanceAmount: Math.abs(meta.advanceAmount),
    };
    await db.insert(expenseClaims).values(row);
    const created = await this.getClaimById(row.id);
    if (!created) throw new Error("Failed to create expense claim");
    return created;
  }

  async updateClaim(
    id: string,
    input: UpdateExpenseClaimInput,
  ): Promise<ExpenseClaim | null> {
    const existing = await this.getClaimById(id);
    if (!existing || existing.status === "reconciled") return null;
    const db = getDb();
    await db
      .update(expenseClaims)
      .set({
        ...(input.lineItems !== undefined
          ? { lineItems: withLineIds(input.lineItems) }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(expenseClaims.id, id));
    return this.getClaimById(id);
  }

  async reconcileClaim(
    id: string,
    meta: {
      reconciledById: string;
      difference: number;
      reconcileLedgerEntryId?: string;
    },
  ): Promise<ExpenseClaim | null> {
    const existing = await this.getClaimById(id);
    if (!existing || existing.status === "reconciled") return null;
    const db = getDb();
    await db
      .update(expenseClaims)
      .set({
        status: "reconciled",
        difference: meta.difference,
        reconciledAt: new Date(),
        reconciledById: meta.reconciledById,
        reconcileLedgerEntryId: meta.reconcileLedgerEntryId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(expenseClaims.id, id));
    return this.getClaimById(id);
  }
}
