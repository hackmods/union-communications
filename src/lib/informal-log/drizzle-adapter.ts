import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { informalLogEntries } from "@/lib/db/schema";
import type { InformalLogAdapter } from "./adapter";
import type {
  CreateInformalLogInput,
  InformalLogEntry,
  InformalLogListFilters,
  UpdateInformalLogInput,
} from "@/types/informal-log";
import type { CommunicationChannel } from "@/types/qol";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapEntry(
  row: typeof informalLogEntries.$inferSelect,
): InformalLogEntry {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    memberPseudonym: row.memberPseudonym ?? undefined,
    topic: row.topic,
    channel: row.channel as CommunicationChannel,
    summary: row.summary,
    occurredAt: toIso(row.occurredAt)!,
    loggedById: row.loggedById,
    loggedByName: row.loggedByName,
    convertedToGrievanceId: row.convertedToGrievanceId ?? undefined,
    createdAt: toIso(row.createdAt)!,
  };
}

export class DrizzleInformalLogAdapter implements InformalLogAdapter {
  async list(filters: InformalLogListFilters): Promise<InformalLogEntry[]> {
    const db = getDb();
    const conditions = [eq(informalLogEntries.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(informalLogEntries.localId, filters.localId));
    }
    if (filters.bargainingUnitId) {
      conditions.push(
        or(
          isNull(informalLogEntries.bargainingUnitId),
          eq(informalLogEntries.bargainingUnitId, filters.bargainingUnitId),
        )!,
      );
    }
    if (filters.unconvertedOnly) {
      conditions.push(isNull(informalLogEntries.convertedToGrievanceId));
    }
    const rows = await db
      .select()
      .from(informalLogEntries)
      .where(and(...conditions));
    return rows
      .map(mapEntry)
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );
  }

  async getById(id: string): Promise<InformalLogEntry | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(informalLogEntries)
      .where(eq(informalLogEntries.id, id))
      .limit(1);
    return rows[0] ? mapEntry(rows[0]) : null;
  }

  async create(
    input: CreateInformalLogInput,
    meta: {
      unionId: string;
      localId: string;
      bargainingUnitId?: string;
      loggedById: string;
      loggedByName: string;
    },
  ): Promise<InformalLogEntry> {
    const db = getDb();
    const id = newId("ilog");
    const ts = new Date();
    await db.insert(informalLogEntries).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId ?? meta.bargainingUnitId,
      memberPseudonym: input.memberPseudonym,
      topic: input.topic,
      channel: input.channel,
      summary: input.summary,
      occurredAt: new Date(input.occurredAt),
      loggedById: meta.loggedById,
      loggedByName: meta.loggedByName,
      createdAt: ts,
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create informal log entry");
    return created;
  }

  async update(
    id: string,
    input: UpdateInformalLogInput,
  ): Promise<InformalLogEntry | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const patch: Partial<typeof informalLogEntries.$inferInsert> = {};
    if (input.memberPseudonym !== undefined) {
      patch.memberPseudonym =
        input.memberPseudonym === null ? null : input.memberPseudonym;
    }
    if (input.topic !== undefined) patch.topic = input.topic;
    if (input.channel !== undefined) patch.channel = input.channel;
    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.occurredAt !== undefined) {
      patch.occurredAt = new Date(input.occurredAt);
    }
    if (input.bargainingUnitId !== undefined) {
      patch.bargainingUnitId =
        input.bargainingUnitId === null ? null : input.bargainingUnitId;
    }
    if (input.convertedToGrievanceId !== undefined) {
      patch.convertedToGrievanceId =
        input.convertedToGrievanceId === null
          ? null
          : input.convertedToGrievanceId;
    }

    const db = getDb();
    await db
      .update(informalLogEntries)
      .set(patch)
      .where(eq(informalLogEntries.id, id));
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;
    const db = getDb();
    await db
      .delete(informalLogEntries)
      .where(eq(informalLogEntries.id, id));
    return true;
  }
}
