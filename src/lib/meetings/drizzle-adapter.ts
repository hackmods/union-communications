import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { localMeetingSchedules } from "@/lib/db/schema";
import type { MeetingsAdapter } from "./adapter";
import { buildPublicSlug } from "./memory-adapter";
import type {
  LocalMeetingSchedule,
  UpsertMeetingScheduleInput,
} from "@/types/meetings";

function newId(): string {
  return `mtgsched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapRow(
  row: typeof localMeetingSchedules.$inferSelect,
): LocalMeetingSchedule {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    recurrence: row.recurrence,
    dayOfMonth: row.dayOfMonth ?? undefined,
    weekday: row.weekday ?? undefined,
    nthWeekOfMonth: row.nthWeekOfMonth ?? undefined,
    customDates: row.customDates ?? undefined,
    time: row.time,
    durationMinutes: row.durationMinutes,
    location: row.location,
    publicBlurb: row.publicBlurb ?? undefined,
    timezone: row.timezone,
    publicSlug: row.publicSlug,
    updatedById: row.updatedById,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export class DrizzleMeetingsAdapter implements MeetingsAdapter {
  async getForLocal(
    unionId: string,
    localId: string,
  ): Promise<LocalMeetingSchedule | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(localMeetingSchedules)
      .where(
        and(
          eq(localMeetingSchedules.unionId, unionId),
          eq(localMeetingSchedules.localId, localId),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async getBySlug(slug: string): Promise<LocalMeetingSchedule | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(localMeetingSchedules)
      .where(eq(localMeetingSchedules.publicSlug, slug.trim().toLowerCase()))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async upsertForLocal(
    unionId: string,
    localId: string,
    input: UpsertMeetingScheduleInput,
    meta: { updatedById: string },
  ): Promise<LocalMeetingSchedule> {
    const db = getDb();
    const existing = await this.getForLocal(unionId, localId);
    const publicSlug = buildPublicSlug(unionId, localId);
    const values = {
      unionId,
      localId,
      recurrence: input.recurrence,
      dayOfMonth: input.dayOfMonth ?? null,
      weekday: input.weekday ?? null,
      nthWeekOfMonth: input.nthWeekOfMonth ?? null,
      customDates: input.customDates ?? null,
      time: input.time,
      durationMinutes: input.durationMinutes ?? 90,
      location: input.location,
      publicBlurb: input.publicBlurb ?? null,
      timezone: input.timezone,
      publicSlug,
      updatedById: meta.updatedById,
      updatedAt: new Date(),
    };

    if (existing) {
      const [row] = await db
        .update(localMeetingSchedules)
        .set(values)
        .where(eq(localMeetingSchedules.id, existing.id))
        .returning();
      return mapRow(row);
    }

    const [row] = await db
      .insert(localMeetingSchedules)
      .values({ id: newId(), ...values, createdAt: new Date() })
      .returning();
    return mapRow(row);
  }
}
