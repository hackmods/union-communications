import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { ledgerEntries } from "@/lib/db/schema";
import type { LedgerAdapter } from "./adapter";
import type {
  CreateLedgerEntryInput,
  LedgerEntry,
  LedgerEntryType,
  LedgerListFilters,
  UpdateLedgerEntryInput,
} from "@/types/ledger";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapEntry(row: typeof ledgerEntries.$inferSelect): LedgerEntry {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    date: row.entryDate,
    description: row.description,
    amount: row.amount,
    type: row.entryType as LedgerEntryType,
    category: row.category,
    recordedById: row.recordedById,
  };
}

function sortEntries(list: LedgerEntry[]): LedgerEntry[] {
  return [...list].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

export class DrizzleLedgerAdapter implements LedgerAdapter {
  async list(filters: LedgerListFilters): Promise<LedgerEntry[]> {
    const db = getDb();
    const conditions = [eq(ledgerEntries.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(ledgerEntries.localId, filters.localId));
    }
    if (filters.type) {
      conditions.push(eq(ledgerEntries.entryType, filters.type));
    }
    if (filters.category) {
      conditions.push(eq(ledgerEntries.category, filters.category));
    }
    if (filters.from) {
      conditions.push(gte(ledgerEntries.entryDate, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(ledgerEntries.entryDate, filters.to));
    }
    const rows = await db
      .select()
      .from(ledgerEntries)
      .where(and(...conditions));
    return sortEntries(rows.map(mapEntry));
  }

  async getById(id: string): Promise<LedgerEntry | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.id, id))
      .limit(1);
    return rows[0] ? mapEntry(rows[0]) : null;
  }

  async create(
    input: CreateLedgerEntryInput,
    meta: {
      unionId: string;
      localId: string;
      recordedById: string;
    },
  ): Promise<LedgerEntry> {
    const db = getDb();
    const id = newId("led");
    await db.insert(ledgerEntries).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      entryDate: input.date,
      description: input.description,
      amount: Math.abs(input.amount),
      entryType: input.type,
      category: input.category,
      recordedById: meta.recordedById,
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create ledger entry");
    return created;
  }

  async update(
    id: string,
    input: UpdateLedgerEntryInput,
  ): Promise<LedgerEntry | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const patch: Partial<typeof ledgerEntries.$inferInsert> = {};
    if (input.date !== undefined) patch.entryDate = input.date;
    if (input.description !== undefined) patch.description = input.description;
    if (input.amount !== undefined) patch.amount = Math.abs(input.amount);
    if (input.type !== undefined) patch.entryType = input.type;
    if (input.category !== undefined) patch.category = input.category;

    if (Object.keys(patch).length === 0) return existing;

    const db = getDb();
    await db.update(ledgerEntries).set(patch).where(eq(ledgerEntries.id, id));
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
      .delete(ledgerEntries)
      .where(eq(ledgerEntries.id, id))
      .returning({ id: ledgerEntries.id });
    return deleted.length > 0;
  }
}
