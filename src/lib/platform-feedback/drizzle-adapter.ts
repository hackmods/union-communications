import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { platformFeedbackSubmissions } from "@/lib/db/schema/platform-feedback";
import type { PlatformFeedbackAdapter } from "./adapter";
import type {
  CreateSiteFeedbackInput,
  CreateSiteFeedbackMeta,
  SiteFeedbackListFilters,
  SiteFeedbackSubmission,
  UpdateSiteFeedbackInput,
} from "@/types/platform-feedback";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(
  row: typeof platformFeedbackSubmissions.$inferSelect,
): SiteFeedbackSubmission {
  return {
    id: row.id,
    createdAt: toIso(row.createdAt),
    category: row.category,
    body: row.body,
    pagePath: row.pagePath ?? undefined,
    locale: row.locale,
    source: row.source,
    submitterUserId: row.submitterUserId ?? undefined,
    contactEmail: row.contactEmail ?? undefined,
    contactName: row.contactName ?? undefined,
    consentAcceptedAt: toIso(row.consentAcceptedAt),
    ipHash: row.ipHash ?? undefined,
    status: row.status,
    stewardNote: row.stewardNote ?? undefined,
  };
}

export class DrizzlePlatformFeedbackAdapter implements PlatformFeedbackAdapter {
  async create(
    input: CreateSiteFeedbackInput,
    meta: CreateSiteFeedbackMeta,
  ): Promise<SiteFeedbackSubmission> {
    const db = getDb();
    const id = newId("fb");
    const createdAt = new Date();
    const rows = await db
      .insert(platformFeedbackSubmissions)
      .values({
        id,
        createdAt,
        category: input.category,
        body: input.body,
        pagePath: input.pagePath ?? null,
        locale: input.locale,
        source: meta.source,
        submitterUserId: meta.submitterUserId ?? null,
        contactEmail: input.contactEmail ?? null,
        contactName: input.contactName ?? null,
        consentAcceptedAt: createdAt,
        ipHash: meta.ipHash ?? null,
        status: "new",
        stewardNote: null,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to insert site feedback");
    }
    return mapRow(row);
  }

  async list(
    filters: SiteFeedbackListFilters = {},
  ): Promise<SiteFeedbackSubmission[]> {
    const db = getDb();
    const conditions = [];
    if (filters.status) {
      conditions.push(eq(platformFeedbackSubmissions.status, filters.status));
    }
    if (filters.category) {
      conditions.push(
        eq(platformFeedbackSubmissions.category, filters.category),
      );
    }
    if (filters.source) {
      conditions.push(eq(platformFeedbackSubmissions.source, filters.source));
    }
    const query = db
      .select()
      .from(platformFeedbackSubmissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(platformFeedbackSubmissions.createdAt))
      .limit(filters.limit ?? 200);
    const rows = await query;
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<SiteFeedbackSubmission | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(platformFeedbackSubmissions)
      .where(eq(platformFeedbackSubmissions.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async update(
    id: string,
    input: UpdateSiteFeedbackInput,
  ): Promise<SiteFeedbackSubmission | null> {
    const db = getDb();
    const patch: Partial<typeof platformFeedbackSubmissions.$inferInsert> = {};
    if (input.status) patch.status = input.status;
    if (input.stewardNote !== undefined) {
      patch.stewardNote = input.stewardNote;
    }
    if (Object.keys(patch).length === 0) {
      return this.getById(id);
    }
    const rows = await db
      .update(platformFeedbackSubmissions)
      .set(patch)
      .where(eq(platformFeedbackSubmissions.id, id))
      .returning();
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const rows = await db
      .delete(platformFeedbackSubmissions)
      .where(eq(platformFeedbackSubmissions.id, id))
      .returning({ id: platformFeedbackSubmissions.id });
    return rows.length > 0;
  }
}
