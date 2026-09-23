import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { caSnippets } from "@/lib/db/schema";
import type {
  SnippetAdapter,
  SnippetBulkCreateResult,
  SnippetListFilters,
} from "./adapter";
import type {
  CaSnippet,
  CreateCaSnippetInput,
  UpdateCaSnippetInput,
} from "@/types/qol";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapSnippet(row: typeof caSnippets.$inferSelect): CaSnippet {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId ?? undefined,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    title: row.title,
    clauseRef: row.clauseRef,
    body: row.body,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function duplicateKey(clauseRef: string, title: string): string {
  return `${clauseRef.trim().toLowerCase()}::${title.trim().toLowerCase()}`;
}

function isValidInput(input: CreateCaSnippetInput): boolean {
  return Boolean(
    input.title?.trim() && input.clauseRef?.trim() && input.body?.trim(),
  );
}

export class DrizzleSnippetAdapter implements SnippetAdapter {
  async list(filters: SnippetListFilters): Promise<CaSnippet[]> {
    const db = getDb();
    const conditions = [eq(caSnippets.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(
        or(
          isNull(caSnippets.localId),
          eq(caSnippets.localId, filters.localId),
        )!,
      );
    }
    if (filters.bargainingUnitId) {
      conditions.push(
        or(
          isNull(caSnippets.bargainingUnitId),
          eq(caSnippets.bargainingUnitId, filters.bargainingUnitId),
        )!,
      );
    }
    const rows = await db
      .select()
      .from(caSnippets)
      .where(and(...conditions));
    let results = rows.map(mapSnippet);
    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.clauseRef.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return results.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async getById(id: string): Promise<CaSnippet | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(caSnippets)
      .where(eq(caSnippets.id, id))
      .limit(1);
    return rows[0] ? mapSnippet(rows[0]) : null;
  }

  async create(
    input: CreateCaSnippetInput,
    meta: {
      unionId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<CaSnippet> {
    const db = getDb();
    const id = newId("snip");
    const ts = new Date();
    await db.insert(caSnippets).values({
      id,
      unionId: meta.unionId,
      localId: input.localId,
      bargainingUnitId: input.bargainingUnitId,
      title: input.title,
      clauseRef: input.clauseRef,
      body: input.body,
      tags: input.tags ?? [],
      createdById: meta.createdById,
      createdByName: meta.createdByName,
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create CA snippet");
    return created;
  }

  async update(
    id: string,
    input: UpdateCaSnippetInput,
  ): Promise<CaSnippet | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const patch: Partial<typeof caSnippets.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) patch.title = input.title;
    if (input.clauseRef !== undefined) patch.clauseRef = input.clauseRef;
    if (input.body !== undefined) patch.body = input.body;
    if (input.tags !== undefined) patch.tags = input.tags;

    const db = getDb();
    await db.update(caSnippets).set(patch).where(eq(caSnippets.id, id));
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;
    const db = getDb();
    await db.delete(caSnippets).where(eq(caSnippets.id, id));
    return true;
  }

  async bulkCreate(
    inputs: CreateCaSnippetInput[],
    meta: {
      unionId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<SnippetBulkCreateResult> {
    const existingRows = await this.list({ unionId: meta.unionId });
    const existing = new Set(
      existingRows.map((s) => duplicateKey(s.clauseRef, s.title)),
    );
    let created = 0;
    let skipped = 0;
    for (const input of inputs) {
      if (!isValidInput(input)) {
        skipped += 1;
        continue;
      }
      const key = duplicateKey(input.clauseRef, input.title);
      if (existing.has(key)) {
        skipped += 1;
        continue;
      }
      await this.create(input, meta);
      existing.add(key);
      created += 1;
    }
    return { created, skipped };
  }

  async resetUnion(unionId: string): Promise<number> {
    const db = getDb();
    const result = await db
      .delete(caSnippets)
      .where(eq(caSnippets.unionId, unionId))
      .returning({ id: caSnippets.id });
    return result.length;
  }
}
