import { desc, eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { bylawDrafts } from "@/lib/db/schema";
import type { BylawsAdapter } from "./adapter";
import type {
  CreateHubBylawDraftInput,
  HubBylawDraft,
  UpdateHubBylawDraftInput,
} from "@/types/hub-bylaws";

function newId(): string {
  return `bylaw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(row: typeof bylawDrafts.$inferSelect): HubBylawDraft {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    title: row.title,
    status: row.status as HubBylawDraft["status"],
    mode: row.mode as HubBylawDraft["mode"],
    form: row.form as HubBylawDraft["form"],
    updatedById: row.updatedById,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

export class DrizzleBylawsAdapter implements BylawsAdapter {
  async list(unionId: string, localId?: string): Promise<HubBylawDraft[]> {
    const db = getDb();
    const conditions = [eq(bylawDrafts.unionId, unionId)];
    if (localId) conditions.push(eq(bylawDrafts.localId, localId));
    const rows = await db
      .select()
      .from(bylawDrafts)
      .where(and(...conditions))
      .orderBy(desc(bylawDrafts.updatedAt));
    return rows.map(mapRow);
  }

  async get(id: string): Promise<HubBylawDraft | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(bylawDrafts)
      .where(eq(bylawDrafts.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(input: CreateHubBylawDraftInput): Promise<HubBylawDraft> {
    const db = getDb();
    const id = newId();
    const ts = new Date();
    await db.insert(bylawDrafts).values({
      id,
      unionId: input.unionId,
      localId: input.localId,
      title: input.title.trim() || "Untitled bylaws draft",
      status: input.status ?? "draft",
      mode: input.mode ?? "template",
      form: input.form as unknown as Record<string, unknown>,
      updatedById: input.updatedById,
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await this.get(id);
    if (!created) throw new Error("Failed to create bylaws draft");
    return created;
  }

  async update(
    id: string,
    input: UpdateHubBylawDraftInput,
  ): Promise<HubBylawDraft | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const db = getDb();
    const patch: Partial<typeof bylawDrafts.$inferInsert> = {
      updatedAt: new Date(),
      updatedById: input.updatedById,
    };
    if (input.title !== undefined) {
      patch.title = input.title.trim() || "Untitled bylaws draft";
    }
    if (input.status !== undefined) patch.status = input.status;
    if (input.mode !== undefined) patch.mode = input.mode;
    if (input.form !== undefined) {
      patch.form = input.form as unknown as Record<string, unknown>;
    }
    await db.update(bylawDrafts).set(patch).where(eq(bylawDrafts.id, id));
    return this.get(id);
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(bylawDrafts)
      .where(eq(bylawDrafts.id, id))
      .returning({ id: bylawDrafts.id });
    return result.length > 0;
  }
}