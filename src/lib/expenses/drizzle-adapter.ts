import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { expenseSubmissions } from "@/lib/db/schema/expenses";
import type { ExpenseAdapter } from "./adapter";
import type {
  CreateExpenseSubmissionInput,
  ExpenseLineItem,
  ExpenseListFilters,
  ExpenseSubmission,
  ExpenseSubmissionStatus,
  UpdateExpenseSubmissionInput,
} from "@/types/expenses";
import { roundMoney, sumLineItems } from "./totals";

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

function mapRow(
  row: typeof expenseSubmissions.$inferSelect,
): ExpenseSubmission {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    submittedById: row.submittedById,
    submittedByName: row.submittedByName,
    title: row.title,
    purpose: row.purpose,
    status: row.status as ExpenseSubmissionStatus,
    lineItems: (row.lineItems as ExpenseLineItem[]) ?? [],
    totalAmount: row.totalAmount,
    approvedById: row.approvedById ?? undefined,
    approvedAt: row.approvedAt?.toISOString(),
    deniedReason: row.deniedReason ?? undefined,
    ledgerEntryId: row.ledgerEntryId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DrizzleExpenseAdapter implements ExpenseAdapter {
  async list(filters: ExpenseListFilters): Promise<ExpenseSubmission[]> {
    const db = getDb();
    const conditions = [eq(expenseSubmissions.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(expenseSubmissions.localId, filters.localId));
    }
    if (filters.status) {
      conditions.push(eq(expenseSubmissions.status, filters.status));
    }
    if (filters.submittedById) {
      conditions.push(
        eq(expenseSubmissions.submittedById, filters.submittedById),
      );
    }
    const rows = await db
      .select()
      .from(expenseSubmissions)
      .where(and(...conditions));
    return rows
      .map(mapRow)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: string): Promise<ExpenseSubmission | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(expenseSubmissions)
      .where(eq(expenseSubmissions.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(
    input: CreateExpenseSubmissionInput,
    meta: {
      unionId: string;
      localId: string;
      submittedById: string;
      submittedByName: string;
    },
  ): Promise<ExpenseSubmission> {
    const lineItems = withLineIds(input.lineItems);
    const totalAmount = roundMoney(sumLineItems(lineItems));
    const id = newId("es");
    const db = getDb();
    const [row] = await db
      .insert(expenseSubmissions)
      .values({
        id,
        unionId: meta.unionId,
        localId: meta.localId,
        submittedById: meta.submittedById,
        submittedByName: meta.submittedByName,
        title: input.title,
        purpose: input.purpose,
        status: "draft",
        lineItems,
        totalAmount,
      })
      .returning();
    return mapRow(row);
  }

  async update(
    id: string,
    input: UpdateExpenseSubmissionInput,
  ): Promise<ExpenseSubmission | null> {
    const existing = await this.getById(id);
    if (!existing || existing.status !== "draft") return null;

    const lineItems =
      input.lineItems !== undefined
        ? withLineIds(input.lineItems)
        : existing.lineItems;
    const totalAmount = roundMoney(sumLineItems(lineItems));

    const db = getDb();
    const [row] = await db
      .update(expenseSubmissions)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
        lineItems,
        totalAmount,
        ...(input.status === "submitted" ? { status: "submitted" } : {}),
        updatedAt: new Date(),
      })
      .where(eq(expenseSubmissions.id, id))
      .returning();
    return row ? mapRow(row) : null;
  }

  async submit(id: string): Promise<ExpenseSubmission | null> {
    const existing = await this.getById(id);
    if (!existing || existing.status !== "draft") return null;
    const db = getDb();
    const [row] = await db
      .update(expenseSubmissions)
      .set({ status: "submitted", updatedAt: new Date() })
      .where(eq(expenseSubmissions.id, id))
      .returning();
    return row ? mapRow(row) : null;
  }

  async approve(
    id: string,
    meta: { approvedById: string; ledgerEntryId: string },
  ): Promise<ExpenseSubmission | null> {
    const existing = await this.getById(id);
    if (!existing || existing.status !== "submitted") return null;
    const db = getDb();
    const [row] = await db
      .update(expenseSubmissions)
      .set({
        status: "approved",
        approvedById: meta.approvedById,
        approvedAt: new Date(),
        ledgerEntryId: meta.ledgerEntryId,
        updatedAt: new Date(),
      })
      .where(eq(expenseSubmissions.id, id))
      .returning();
    return row ? mapRow(row) : null;
  }

  async deny(
    id: string,
    meta: { deniedById: string; reason?: string },
  ): Promise<ExpenseSubmission | null> {
    const existing = await this.getById(id);
    if (!existing || existing.status !== "submitted") return null;
    const db = getDb();
    const [row] = await db
      .update(expenseSubmissions)
      .set({
        status: "denied",
        approvedById: meta.deniedById,
        approvedAt: new Date(),
        deniedReason: meta.reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(expenseSubmissions.id, id))
      .returning();
    return row ? mapRow(row) : null;
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(expenseSubmissions)
      .where(eq(expenseSubmissions.id, id))
      .returning({ id: expenseSubmissions.id });
    return result.length > 0;
  }
}
