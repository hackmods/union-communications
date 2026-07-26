import {
  and,
  asc,
  desc,
  eq,
} from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { checkinAnswers, checkinSchedules } from "@/lib/db/schema";
import type { CheckinsAdapter } from "./adapter";
import type {
  CheckinAnswer,
  CheckinListFilters,
  CheckinSchedule,
  CreateCheckinAnswerInput,
  CreateCheckinScheduleInput,
  UpdateCheckinScheduleInput,
} from "@/types/checkins";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapSchedule(
  row: typeof checkinSchedules.$inferSelect,
): CheckinSchedule {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    question: row.question,
    cadence: row.cadence as CheckinSchedule["cadence"],
    weekday: row.weekday ?? undefined,
    active: row.active,
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapAnswer(row: typeof checkinAnswers.$inferSelect): CheckinAnswer {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    unionId: row.unionId,
    localId: row.localId,
    periodKey: row.periodKey,
    authorId: row.authorId,
    authorName: row.authorName,
    body: row.body,
    createdAt: toIso(row.createdAt)!,
  };
}

export class DrizzleCheckinsAdapter implements CheckinsAdapter {
  async listSchedules(
    filters: CheckinListFilters,
  ): Promise<CheckinSchedule[]> {
    const db = getDb();
    const conditions = [eq(checkinSchedules.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(checkinSchedules.localId, filters.localId));
    }
    if (filters.bargainingUnitId) {
      conditions.push(
        eq(checkinSchedules.bargainingUnitId, filters.bargainingUnitId),
      );
    }
    if (filters.activeOnly) {
      conditions.push(eq(checkinSchedules.active, true));
    }
    const rows = await db
      .select()
      .from(checkinSchedules)
      .where(and(...conditions))
      .orderBy(desc(checkinSchedules.updatedAt));
    return rows.map(mapSchedule);
  }

  async getSchedule(id: string): Promise<CheckinSchedule | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(checkinSchedules)
      .where(eq(checkinSchedules.id, id))
      .limit(1);
    return rows[0] ? mapSchedule(rows[0]) : null;
  }

  async createSchedule(
    input: CreateCheckinScheduleInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<CheckinSchedule> {
    const db = getDb();
    const id = newId("checkin-sched");
    const ts = new Date();
    await db.insert(checkinSchedules).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId,
      question: input.question,
      cadence: input.cadence,
      weekday: input.cadence === "weekly" ? (input.weekday ?? null) : null,
      active: true,
      createdById: meta.createdById,
      createdByName: meta.createdByName,
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await this.getSchedule(id);
    if (!created) throw new Error("Failed to create check-in schedule");
    return created;
  }

  async updateSchedule(
    id: string,
    input: UpdateCheckinScheduleInput,
  ): Promise<CheckinSchedule | null> {
    const existing = await this.getSchedule(id);
    if (!existing) return null;

    const cadence = input.cadence ?? existing.cadence;
    let weekday: number | null | undefined = existing.weekday ?? null;
    if (input.weekday !== undefined) {
      weekday = input.weekday;
    }
    if (cadence !== "weekly") weekday = null;

    const db = getDb();
    await db
      .update(checkinSchedules)
      .set({
        ...(input.question !== undefined ? { question: input.question } : {}),
        ...(input.cadence !== undefined ? { cadence: input.cadence } : {}),
        weekday,
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.bargainingUnitId !== undefined
          ? { bargainingUnitId: input.bargainingUnitId }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(checkinSchedules.id, id));
    return this.getSchedule(id);
  }

  async listAnswers(
    scheduleId: string,
    periodKey: string,
  ): Promise<CheckinAnswer[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(checkinAnswers)
      .where(
        and(
          eq(checkinAnswers.scheduleId, scheduleId),
          eq(checkinAnswers.periodKey, periodKey),
        ),
      )
      .orderBy(asc(checkinAnswers.createdAt));
    return rows.map(mapAnswer);
  }

  async getAnswer(
    scheduleId: string,
    periodKey: string,
    authorId: string,
  ): Promise<CheckinAnswer | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(checkinAnswers)
      .where(
        and(
          eq(checkinAnswers.scheduleId, scheduleId),
          eq(checkinAnswers.periodKey, periodKey),
          eq(checkinAnswers.authorId, authorId),
        ),
      )
      .limit(1);
    return rows[0] ? mapAnswer(rows[0]) : null;
  }

  async createAnswer(
    scheduleId: string,
    input: CreateCheckinAnswerInput & { periodKey: string },
    meta: {
      unionId: string;
      localId: string;
      authorId: string;
      authorName: string;
    },
  ): Promise<CheckinAnswer | null> {
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) return null;

    const existing = await this.getAnswer(
      scheduleId,
      input.periodKey,
      meta.authorId,
    );
    if (existing) return null;

    const db = getDb();
    const id = newId("checkin-ans");
    try {
      await db.insert(checkinAnswers).values({
        id,
        scheduleId,
        unionId: meta.unionId,
        localId: meta.localId,
        periodKey: input.periodKey,
        authorId: meta.authorId,
        authorName: meta.authorName,
        body: input.body,
        createdAt: new Date(),
      });
    } catch {
      return null;
    }
    return this.getAnswer(scheduleId, input.periodKey, meta.authorId);
  }
}
