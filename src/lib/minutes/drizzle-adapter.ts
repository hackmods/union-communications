import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { meetingMinutes } from "@/lib/db/schema";
import type { MinutesAdapter } from "./adapter";
import type {
  CreateMeetingMinutesInput,
  MeetingMinutes,
  MeetingMinutesListFilters,
  UpdateMeetingMinutesInput,
} from "@/types/minutes";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(row: typeof meetingMinutes.$inferSelect): MeetingMinutes {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    meetingDate: toIso(row.meetingDate)!,
    meetingType: row.meetingType,
    attendees: row.attendees ?? [],
    motions: row.motions ?? [],
    notes: row.notes,
    recordedById: row.recordedById,
    recordedByName: row.recordedByName,
    status: row.status,
    approvedAt: toIso(row.approvedAt),
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

export class DrizzleMinutesAdapter implements MinutesAdapter {
  async list(filters: MeetingMinutesListFilters): Promise<MeetingMinutes[]> {
    const db = getDb();
    const conditions = [eq(meetingMinutes.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(meetingMinutes.localId, filters.localId));
    }
    if (filters.status) {
      conditions.push(eq(meetingMinutes.status, filters.status));
    }
    if (filters.meetingType) {
      conditions.push(eq(meetingMinutes.meetingType, filters.meetingType));
    }
    const rows = await db
      .select()
      .from(meetingMinutes)
      .where(and(...conditions));
    return rows
      .map(mapRow)
      .sort(
        (a, b) =>
          new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime(),
      );
  }

  async getById(id: string): Promise<MeetingMinutes | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(meetingMinutes)
      .where(eq(meetingMinutes.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(
    input: CreateMeetingMinutesInput,
    meta: {
      unionId: string;
      localId: string;
      recordedById: string;
      recordedByName: string;
    },
  ): Promise<MeetingMinutes> {
    const db = getDb();
    const id = newId("minutes");
    const ts = new Date();
    await db.insert(meetingMinutes).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      meetingDate: new Date(input.meetingDate),
      meetingType: input.meetingType,
      attendees: input.attendees,
      motions: input.motions,
      notes: input.notes,
      recordedById: meta.recordedById,
      recordedByName: meta.recordedByName,
      status: "draft",
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create meeting minutes");
    return created;
  }

  async update(
    id: string,
    input: UpdateMeetingMinutesInput,
  ): Promise<MeetingMinutes | null> {
    const existing = await this.getById(id);
    if (!existing || existing.status === "approved") return null;

    const patch: Partial<typeof meetingMinutes.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.meetingDate !== undefined) {
      patch.meetingDate = new Date(input.meetingDate);
    }
    if (input.meetingType !== undefined) patch.meetingType = input.meetingType;
    if (input.attendees !== undefined) patch.attendees = input.attendees;
    if (input.motions !== undefined) patch.motions = input.motions;
    if (input.notes !== undefined) patch.notes = input.notes;

    const db = getDb();
    await db
      .update(meetingMinutes)
      .set(patch)
      .where(eq(meetingMinutes.id, id));
    return this.getById(id);
  }

  async approve(id: string): Promise<MeetingMinutes | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    if (existing.status === "approved") return existing;

    const now = new Date();
    const db = getDb();
    await db
      .update(meetingMinutes)
      .set({
        status: "approved",
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(meetingMinutes.id, id));
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;
    const db = getDb();
    await db.delete(meetingMinutes).where(eq(meetingMinutes.id, id));
    return true;
  }
}
