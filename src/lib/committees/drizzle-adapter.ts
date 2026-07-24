import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { committees } from "@/lib/db/schema";
import type { CommitteesAdapter } from "./adapter";
import type {
  Committee,
  CommitteeListFilters,
  CreateCommitteeInput,
  UpdateCommitteeInput,
} from "@/types/committees";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(row: typeof committees.$inferSelect): Committee {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    description: row.description ?? undefined,
    memberOfficerIds: row.memberOfficerIds ?? [],
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

export class DrizzleCommitteesAdapter implements CommitteesAdapter {
  async list(filters: CommitteeListFilters): Promise<Committee[]> {
    const db = getDb();
    const conditions = [eq(committees.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(committees.localId, filters.localId));
    }
    const rows = await db
      .select()
      .from(committees)
      .where(and(...conditions));
    return rows.map(mapRow).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id: string): Promise<Committee | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(committees)
      .where(eq(committees.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(
    input: CreateCommitteeInput,
    meta: { unionId: string; localId: string },
  ): Promise<Committee> {
    const db = getDb();
    const id = newId("com");
    const ts = new Date();
    await db.insert(committees).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      memberOfficerIds: [...(input.memberOfficerIds ?? [])],
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create committee");
    return created;
  }

  async update(
    id: string,
    input: UpdateCommitteeInput,
  ): Promise<Committee | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = getDb();
    const patch: Partial<typeof committees.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) {
      patch.description =
        input.description === null || input.description.trim() === ""
          ? null
          : input.description.trim();
    }
    if (input.memberOfficerIds !== undefined) {
      patch.memberOfficerIds = [...input.memberOfficerIds];
    }
    await db.update(committees).set(patch).where(eq(committees.id, id));
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(committees)
      .where(eq(committees.id, id))
      .returning({ id: committees.id });
    return result.length > 0;
  }
}
