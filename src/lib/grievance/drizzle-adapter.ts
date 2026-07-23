import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  grievanceEvents,
  grievanceNotes,
  grievances,
  memberCommunications,
  scheduledMeetings,
} from "@/lib/db/schema";
import type { GrievanceAdapter } from "./adapter";
import type {
  CreateEventInput,
  CreateGrievanceInput,
  CreateNoteInput,
  Grievance,
  GrievanceEvent,
  GrievanceListFilters,
  GrievanceNote,
  GrievanceStatus,
  GrievanceWithRelations,
  UpdateGrievanceInput,
} from "@/types/grievance";
import type {
  CreateCommunicationInput,
  CreateMeetingInput,
  MemberCommunication,
  ScheduledMeeting,
} from "@/types/qol";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapGrievance(row: typeof grievances.$inferSelect): Grievance {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    memberPseudonym: row.memberPseudonym ?? undefined,
    category: row.category,
    status: row.status as GrievanceStatus,
    currentStep: row.currentStep,
    filedAt: toIso(row.filedAt)!,
    resolvedAt: toIso(row.resolvedAt),
    assignedStewardId: row.assignedStewardId,
    createdById: row.createdById,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapEvent(row: typeof grievanceEvents.$inferSelect): GrievanceEvent {
  return {
    id: row.id,
    grievanceId: row.grievanceId,
    type: row.type as GrievanceEvent["type"],
    stepNumber: row.stepNumber ?? undefined,
    dueAt: toIso(row.dueAt),
    completedAt: toIso(row.completedAt),
    note: row.note ?? undefined,
    createdAt: toIso(row.createdAt)!,
  };
}

function mapNote(row: typeof grievanceNotes.$inferSelect): GrievanceNote {
  return {
    id: row.id,
    grievanceId: row.grievanceId,
    authorId: row.authorId,
    authorName: row.authorName,
    body: row.body,
    createdAt: toIso(row.createdAt)!,
  };
}

function mapComm(
  row: typeof memberCommunications.$inferSelect,
): MemberCommunication {
  return {
    id: row.id,
    grievanceId: row.grievanceId,
    unionId: row.unionId,
    localId: row.localId,
    channel: row.channel as MemberCommunication["channel"],
    direction: row.direction as MemberCommunication["direction"],
    summary: row.summary,
    occurredAt: toIso(row.occurredAt)!,
    loggedById: row.loggedById,
    loggedByName: row.loggedByName,
    createdAt: toIso(row.createdAt)!,
  };
}

function mapMeeting(
  row: typeof scheduledMeetings.$inferSelect,
): ScheduledMeeting {
  return {
    id: row.id,
    grievanceId: row.grievanceId,
    unionId: row.unionId,
    localId: row.localId,
    title: row.title,
    startsAt: toIso(row.startsAt)!,
    endsAt: toIso(row.endsAt) ?? toIso(row.startsAt)!,
    location: row.location ?? undefined,
    description: row.description ?? undefined,
    createdById: row.createdById,
    createdAt: toIso(row.createdAt)!,
  };
}

export class DrizzleGrievanceAdapter implements GrievanceAdapter {
  async list(filters: GrievanceListFilters): Promise<Grievance[]> {
    const db = getDb();
    const conditions = [eq(grievances.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(grievances.localId, filters.localId));
    }
    if (filters.assignedStewardId) {
      conditions.push(
        eq(grievances.assignedStewardId, filters.assignedStewardId),
      );
    }
    if (filters.status) {
      conditions.push(eq(grievances.status, filters.status));
    }

    const rows = await db
      .select()
      .from(grievances)
      .where(and(...conditions))
      .orderBy(desc(grievances.filedAt));

    let mapped = rows.map(mapGrievance);
    if (filters.bargainingUnitId) {
      mapped = mapped.filter(
        (g) =>
          !g.bargainingUnitId ||
          g.bargainingUnitId === filters.bargainingUnitId,
      );
    }
    return mapped;
  }

  async getById(grievanceId: string): Promise<GrievanceWithRelations | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(grievances)
      .where(eq(grievances.id, grievanceId))
      .limit(1);
    if (!row) return null;

    const [eventRows, noteRows, commRows, meetingRows] = await Promise.all([
      db
        .select()
        .from(grievanceEvents)
        .where(eq(grievanceEvents.grievanceId, grievanceId))
        .orderBy(desc(grievanceEvents.createdAt)),
      db
        .select()
        .from(grievanceNotes)
        .where(eq(grievanceNotes.grievanceId, grievanceId))
        .orderBy(desc(grievanceNotes.createdAt)),
      db
        .select()
        .from(memberCommunications)
        .where(eq(memberCommunications.grievanceId, grievanceId))
        .orderBy(desc(memberCommunications.occurredAt)),
      db
        .select()
        .from(scheduledMeetings)
        .where(eq(scheduledMeetings.grievanceId, grievanceId))
        .orderBy(desc(scheduledMeetings.startsAt)),
    ]);

    return {
      grievance: mapGrievance(row),
      events: eventRows.map(mapEvent),
      notes: noteRows.map(mapNote),
      communications: commRows.map(mapComm),
      meetings: meetingRows.map(mapMeeting),
    };
  }

  async create(
    input: CreateGrievanceInput,
    meta: {
      unionId: string;
      localId: string;
      bargainingUnitId?: string;
      createdById: string;
      assignedStewardId: string;
    },
  ): Promise<GrievanceWithRelations> {
    const db = getDb();
    const now = new Date();
    const grievanceId = newId("grev");
    const eventId = newId("evt");
    const filedAt = new Date(input.filedAt);

    await db.insert(grievances).values({
      id: grievanceId,
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId ?? meta.bargainingUnitId,
      memberPseudonym: input.memberPseudonym,
      category: input.category,
      status: "open",
      currentStep: 1,
      filedAt,
      assignedStewardId: meta.assignedStewardId,
      createdById: meta.createdById,
      updatedAt: now,
    });

    await db.insert(grievanceEvents).values({
      id: eventId,
      grievanceId,
      type: "step_filed",
      stepNumber: 1,
      createdAt: now,
    });

    const full = await this.getById(grievanceId);
    if (!full) throw new Error("Failed to load created grievance");
    return full;
  }

  async update(
    grievanceId: string,
    input: UpdateGrievanceInput,
  ): Promise<Grievance | null> {
    const db = getDb();
    const existing = await this.getById(grievanceId);
    if (!existing) return null;

    const patch: Partial<typeof grievances.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.status !== undefined) patch.status = input.status;
    if (input.currentStep !== undefined) patch.currentStep = input.currentStep;
    if (input.memberPseudonym !== undefined) {
      patch.memberPseudonym = input.memberPseudonym;
    }
    if (input.category !== undefined) patch.category = input.category;
    if (input.assignedStewardId !== undefined) {
      patch.assignedStewardId = input.assignedStewardId;
    }
    if (input.bargainingUnitId !== undefined) {
      patch.bargainingUnitId =
        input.bargainingUnitId === null ? null : input.bargainingUnitId;
    }
    if (input.resolvedAt !== undefined) {
      patch.resolvedAt =
        input.resolvedAt === null ? null : new Date(input.resolvedAt);
    }

    await db
      .update(grievances)
      .set(patch)
      .where(eq(grievances.id, grievanceId));

    const [row] = await db
      .select()
      .from(grievances)
      .where(eq(grievances.id, grievanceId))
      .limit(1);
    return row ? mapGrievance(row) : null;
  }

  async addNote(
    grievanceId: string,
    input: CreateNoteInput,
    meta: { authorId: string; authorName: string },
  ): Promise<GrievanceNote | null> {
    const db = getDb();
    const existing = await this.getById(grievanceId);
    if (!existing) return null;
    const noteId = newId("note");
    const createdAt = new Date();
    await db.insert(grievanceNotes).values({
      id: noteId,
      grievanceId,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt,
    });
    return {
      id: noteId,
      grievanceId,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt: createdAt.toISOString(),
    };
  }

  async addEvent(
    grievanceId: string,
    input: CreateEventInput,
  ): Promise<GrievanceEvent | null> {
    const db = getDb();
    const existing = await this.getById(grievanceId);
    if (!existing) return null;
    const eventId = newId("evt");
    const createdAt = new Date();
    await db.insert(grievanceEvents).values({
      id: eventId,
      grievanceId,
      type: input.type,
      stepNumber: input.stepNumber,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      note: input.note,
      createdAt,
    });
    return {
      id: eventId,
      grievanceId,
      type: input.type,
      stepNumber: input.stepNumber,
      dueAt: input.dueAt,
      completedAt: input.completedAt,
      note: input.note,
      createdAt: createdAt.toISOString(),
    };
  }

  async addCommunication(
    grievanceId: string,
    input: CreateCommunicationInput,
    meta: {
      unionId: string;
      localId: string;
      loggedById: string;
      loggedByName: string;
    },
  ): Promise<MemberCommunication | null> {
    const db = getDb();
    const existing = await this.getById(grievanceId);
    if (!existing) return null;
    const commId = newId("comm");
    const createdAt = new Date();
    await db.insert(memberCommunications).values({
      id: commId,
      grievanceId,
      unionId: meta.unionId,
      localId: meta.localId,
      channel: input.channel,
      direction: input.direction,
      summary: input.summary,
      occurredAt: new Date(input.occurredAt),
      loggedById: meta.loggedById,
      loggedByName: meta.loggedByName,
      createdAt,
    });
    return {
      id: commId,
      grievanceId,
      unionId: meta.unionId,
      localId: meta.localId,
      channel: input.channel,
      direction: input.direction,
      summary: input.summary,
      occurredAt: input.occurredAt,
      loggedById: meta.loggedById,
      loggedByName: meta.loggedByName,
      createdAt: createdAt.toISOString(),
    };
  }

  async listCommunications(
    grievanceId: string,
  ): Promise<MemberCommunication[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(memberCommunications)
      .where(eq(memberCommunications.grievanceId, grievanceId))
      .orderBy(desc(memberCommunications.occurredAt));
    return rows.map(mapComm);
  }

  async addMeeting(
    grievanceId: string,
    input: CreateMeetingInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
    },
  ): Promise<ScheduledMeeting | null> {
    const db = getDb();
    const existing = await this.getById(grievanceId);
    if (!existing) return null;
    const meetingId = newId("meet");
    const createdAt = new Date();
    await db.insert(scheduledMeetings).values({
      id: meetingId,
      grievanceId,
      unionId: meta.unionId,
      localId: meta.localId,
      title: input.title,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      location: input.location,
      description: input.description,
      createdById: meta.createdById,
      createdAt,
    });
    await this.addEvent(grievanceId, {
      type: "meeting_scheduled",
      dueAt: input.startsAt,
      note: `${input.title}${input.location ? ` @ ${input.location}` : ""}`,
    });
    return {
      id: meetingId,
      grievanceId,
      unionId: meta.unionId,
      localId: meta.localId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      description: input.description,
      createdById: meta.createdById,
      createdAt: createdAt.toISOString(),
    };
  }

  async listMeetings(grievanceId: string): Promise<ScheduledMeeting[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(scheduledMeetings)
      .where(eq(scheduledMeetings.grievanceId, grievanceId))
      .orderBy(desc(scheduledMeetings.startsAt));
    return rows.map(mapMeeting);
  }

  async importLocalSlice(
    unionId: string,
    localId: string,
    items: GrievanceWithRelations[],
    mode: "merge" | "replace",
  ): Promise<{ imported: number; removed: number }> {
    const db = getDb();
    let removed = 0;

    if (mode === "replace") {
      const existing = await db
        .select({ id: grievances.id })
        .from(grievances)
        .where(
          and(eq(grievances.unionId, unionId), eq(grievances.localId, localId)),
        );
      const ids = existing.map((r) => r.id);
      removed = ids.length;
      if (ids.length > 0) {
        await db.delete(grievances).where(inArray(grievances.id, ids));
      }
    }

    let imported = 0;
    for (const item of items) {
      const g = item.grievance;
      if (g.unionId !== unionId || g.localId !== localId) continue;

      await db
        .delete(grievances)
        .where(eq(grievances.id, g.id))
        .catch(() => undefined);

      await db.insert(grievances).values({
        id: g.id,
        unionId: g.unionId,
        localId: g.localId,
        bargainingUnitId: g.bargainingUnitId,
        memberPseudonym: g.memberPseudonym,
        category: g.category,
        status: g.status,
        currentStep: g.currentStep,
        filedAt: new Date(g.filedAt),
        resolvedAt: g.resolvedAt ? new Date(g.resolvedAt) : null,
        assignedStewardId: g.assignedStewardId,
        createdById: g.createdById,
        updatedAt: new Date(g.updatedAt),
      });

      if (item.events.length) {
        await db.insert(grievanceEvents).values(
          item.events.map((e) => ({
            id: e.id,
            grievanceId: e.grievanceId,
            type: e.type,
            stepNumber: e.stepNumber,
            dueAt: e.dueAt ? new Date(e.dueAt) : null,
            completedAt: e.completedAt ? new Date(e.completedAt) : null,
            note: e.note,
            createdAt: new Date(e.createdAt),
          })),
        );
      }
      if (item.notes.length) {
        await db.insert(grievanceNotes).values(
          item.notes.map((n) => ({
            id: n.id,
            grievanceId: n.grievanceId,
            authorId: n.authorId,
            authorName: n.authorName,
            body: n.body,
            createdAt: new Date(n.createdAt),
          })),
        );
      }
      if (item.communications?.length) {
        await db.insert(memberCommunications).values(
          item.communications.map((c) => ({
            id: c.id,
            grievanceId: c.grievanceId,
            unionId: c.unionId,
            localId: c.localId,
            channel: c.channel,
            direction: c.direction,
            summary: c.summary,
            occurredAt: new Date(c.occurredAt),
            loggedById: c.loggedById,
            loggedByName: c.loggedByName,
            createdAt: new Date(c.createdAt),
          })),
        );
      }
      if (item.meetings?.length) {
        await db.insert(scheduledMeetings).values(
          item.meetings.map((m) => ({
            id: m.id,
            grievanceId: m.grievanceId,
            unionId: m.unionId,
            localId: m.localId,
            title: m.title,
            startsAt: new Date(m.startsAt),
            endsAt: m.endsAt ? new Date(m.endsAt) : null,
            location: m.location,
            description: m.description,
            createdById: m.createdById,
            createdAt: new Date(m.createdAt),
          })),
        );
      }
      imported += 1;
    }

    return { imported, removed };
  }
}
