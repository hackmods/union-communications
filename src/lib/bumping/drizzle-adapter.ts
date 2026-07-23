import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  bumpingCases,
  committeeNotes,
  committeeSessions,
  decisionRecords,
} from "@/lib/db/schema";
import { emptyChecklistState } from "./checklist";
import type { BumpingAdapter } from "./adapter";
import type {
  BumpingCase,
  BumpingCaseStatus,
  BumpingCaseWithRelations,
  BumpingListFilters,
  CommitteeNote,
  CommitteeSession,
  CreateBumpingCaseInput,
  CreateDecisionInput,
  CreateNoteInput,
  CreateSessionInput,
  DecisionRecord,
  UpdateBumpingCaseInput,
} from "@/types/bumping";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapCase(row: typeof bumpingCases.$inferSelect): BumpingCase {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    memberRef: row.memberRef,
    seniorityDate: row.seniorityDate,
    currentPosition: row.currentPosition,
    targetPosition: row.targetPosition,
    scenario: row.scenario,
    status: row.status as BumpingCaseStatus,
    incumbentPosition: row.incumbentPosition,
    bumpingPosition: row.bumpingPosition,
    checklist: row.checklist,
    createdById: row.createdById,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapSession(
  row: typeof committeeSessions.$inferSelect,
): CommitteeSession {
  return {
    id: row.id,
    bumpingCaseId: row.bumpingCaseId,
    date: row.date,
    attendees: row.attendees,
    agenda: row.agenda,
    createdById: row.createdById,
    createdAt: toIso(row.createdAt)!,
  };
}

function mapNote(row: typeof committeeNotes.$inferSelect): CommitteeNote {
  return {
    id: row.id,
    bumpingCaseId: row.bumpingCaseId,
    sessionId: row.sessionId ?? undefined,
    authorId: row.authorId,
    authorName: row.authorName,
    body: row.body,
    createdAt: toIso(row.createdAt)!,
  };
}

function mapDecision(
  row: typeof decisionRecords.$inferSelect,
): DecisionRecord {
  return {
    id: row.id,
    bumpingCaseId: row.bumpingCaseId,
    outcome: row.outcome,
    rationale: row.rationale,
    dissentNotes: row.dissentNotes ?? undefined,
    recordedById: row.recordedById,
    recordedAt: toIso(row.recordedAt)!,
  };
}

export class DrizzleBumpingAdapter implements BumpingAdapter {
  async list(filters: BumpingListFilters): Promise<BumpingCase[]> {
    const db = getDb();
    const conditions = [eq(bumpingCases.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(bumpingCases.localId, filters.localId));
    }
    const rows = await db
      .select()
      .from(bumpingCases)
      .where(and(...conditions))
      .orderBy(desc(bumpingCases.updatedAt));
    return rows.map(mapCase);
  }

  async getById(caseId: string): Promise<BumpingCaseWithRelations | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(bumpingCases)
      .where(eq(bumpingCases.id, caseId))
      .limit(1);
    if (!row) return null;

    const [sessionRows, noteRows, decisionRows] = await Promise.all([
      db
        .select()
        .from(committeeSessions)
        .where(eq(committeeSessions.bumpingCaseId, caseId))
        .orderBy(desc(committeeSessions.date)),
      db
        .select()
        .from(committeeNotes)
        .where(eq(committeeNotes.bumpingCaseId, caseId))
        .orderBy(desc(committeeNotes.createdAt)),
      db
        .select()
        .from(decisionRecords)
        .where(eq(decisionRecords.bumpingCaseId, caseId))
        .limit(1),
    ]);

    return {
      bumpingCase: mapCase(row),
      sessions: sessionRows.map(mapSession),
      notes: noteRows.map(mapNote),
      decision: decisionRows[0] ? mapDecision(decisionRows[0]) : null,
    };
  }

  async create(
    input: CreateBumpingCaseInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<BumpingCaseWithRelations> {
    const db = getDb();
    const now = new Date();
    const caseId = newId("bump");
    await db.insert(bumpingCases).values({
      id: caseId,
      unionId: meta.unionId,
      localId: meta.localId,
      memberRef: input.memberRef,
      seniorityDate: input.seniorityDate,
      currentPosition: input.currentPosition,
      targetPosition: input.targetPosition,
      scenario: input.scenario,
      status: "open",
      incumbentPosition: input.incumbentPosition,
      bumpingPosition: input.bumpingPosition,
      checklist: emptyChecklistState(),
      createdById: meta.createdById,
      createdAt: now,
      updatedAt: now,
    });
    const full = await this.getById(caseId);
    if (!full) throw new Error("Failed to load created bumping case");
    return full;
  }

  async update(
    caseId: string,
    input: UpdateBumpingCaseInput,
  ): Promise<BumpingCase | null> {
    const db = getDb();
    const existing = await this.getById(caseId);
    if (!existing) return null;

    const patch: Partial<typeof bumpingCases.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.status !== undefined) patch.status = input.status;
    if (input.incumbentPosition !== undefined) {
      patch.incumbentPosition = input.incumbentPosition;
    }
    if (input.bumpingPosition !== undefined) {
      patch.bumpingPosition = input.bumpingPosition;
    }
    if (input.checklist !== undefined) patch.checklist = input.checklist;

    await db
      .update(bumpingCases)
      .set(patch)
      .where(eq(bumpingCases.id, caseId));

    const [row] = await db
      .select()
      .from(bumpingCases)
      .where(eq(bumpingCases.id, caseId))
      .limit(1);
    return row ? mapCase(row) : null;
  }

  async addSession(
    caseId: string,
    input: CreateSessionInput,
    meta: { createdById: string },
  ): Promise<CommitteeSession | null> {
    const db = getDb();
    const existing = await this.getById(caseId);
    if (!existing) return null;
    const sessionId = newId("sess");
    const createdAt = new Date();
    await db.insert(committeeSessions).values({
      id: sessionId,
      bumpingCaseId: caseId,
      date: input.date,
      attendees: input.attendees,
      agenda: input.agenda,
      createdById: meta.createdById,
      createdAt,
    });
    return {
      id: sessionId,
      bumpingCaseId: caseId,
      date: input.date,
      attendees: input.attendees,
      agenda: input.agenda,
      createdById: meta.createdById,
      createdAt: createdAt.toISOString(),
    };
  }

  async addNote(
    caseId: string,
    input: CreateNoteInput,
    meta: { authorId: string; authorName: string },
  ): Promise<CommitteeNote | null> {
    const db = getDb();
    const existing = await this.getById(caseId);
    if (!existing) return null;
    const noteId = newId("cnote");
    const createdAt = new Date();
    await db.insert(committeeNotes).values({
      id: noteId,
      bumpingCaseId: caseId,
      sessionId: input.sessionId,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt,
    });
    return {
      id: noteId,
      bumpingCaseId: caseId,
      sessionId: input.sessionId,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt: createdAt.toISOString(),
    };
  }

  async recordDecision(
    caseId: string,
    input: CreateDecisionInput,
    meta: { recordedById: string },
  ): Promise<DecisionRecord | null> {
    const db = getDb();
    const existing = await this.getById(caseId);
    if (!existing) return null;

    const recordedAt = new Date();
    const recordId = existing.decision?.id ?? newId("dec");

    if (existing.decision) {
      await db
        .update(decisionRecords)
        .set({
          outcome: input.outcome,
          rationale: input.rationale,
          dissentNotes: input.dissentNotes,
          recordedById: meta.recordedById,
          recordedAt,
        })
        .where(eq(decisionRecords.bumpingCaseId, caseId));
    } else {
      await db.insert(decisionRecords).values({
        id: recordId,
        bumpingCaseId: caseId,
        outcome: input.outcome,
        rationale: input.rationale,
        dissentNotes: input.dissentNotes,
        recordedById: meta.recordedById,
        recordedAt,
      });
    }

    await db
      .update(bumpingCases)
      .set({ status: "decided", updatedAt: recordedAt })
      .where(eq(bumpingCases.id, caseId));

    return {
      id: recordId,
      bumpingCaseId: caseId,
      outcome: input.outcome,
      rationale: input.rationale,
      dissentNotes: input.dissentNotes,
      recordedById: meta.recordedById,
      recordedAt: recordedAt.toISOString(),
    };
  }

  async importLocalSlice(
    unionId: string,
    localId: string,
    items: BumpingCaseWithRelations[],
    mode: "merge" | "replace",
  ): Promise<{ imported: number; removed: number }> {
    const db = getDb();
    let removed = 0;

    if (mode === "replace") {
      const existing = await db
        .select({ id: bumpingCases.id })
        .from(bumpingCases)
        .where(
          and(
            eq(bumpingCases.unionId, unionId),
            eq(bumpingCases.localId, localId),
          ),
        );
      const ids = existing.map((r) => r.id);
      removed = ids.length;
      if (ids.length > 0) {
        await db.delete(bumpingCases).where(inArray(bumpingCases.id, ids));
      }
    }

    let imported = 0;
    for (const item of items) {
      const c = item.bumpingCase;
      if (c.unionId !== unionId || c.localId !== localId) continue;

      await db.delete(bumpingCases).where(eq(bumpingCases.id, c.id));

      await db.insert(bumpingCases).values({
        id: c.id,
        unionId: c.unionId,
        localId: c.localId,
        memberRef: c.memberRef,
        seniorityDate: c.seniorityDate,
        currentPosition: c.currentPosition,
        targetPosition: c.targetPosition,
        scenario: c.scenario,
        status: c.status,
        incumbentPosition: c.incumbentPosition,
        bumpingPosition: c.bumpingPosition,
        checklist: c.checklist,
        createdById: c.createdById,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      });

      if (item.sessions.length) {
        await db.insert(committeeSessions).values(
          item.sessions.map((s) => ({
            id: s.id,
            bumpingCaseId: s.bumpingCaseId,
            date: s.date,
            attendees: s.attendees,
            agenda: s.agenda,
            createdById: s.createdById,
            createdAt: new Date(s.createdAt),
          })),
        );
      }
      if (item.notes.length) {
        await db.insert(committeeNotes).values(
          item.notes.map((n) => ({
            id: n.id,
            bumpingCaseId: n.bumpingCaseId,
            sessionId: n.sessionId,
            authorId: n.authorId,
            authorName: n.authorName,
            body: n.body,
            createdAt: new Date(n.createdAt),
          })),
        );
      }
      if (item.decision) {
        const d = item.decision;
        await db.insert(decisionRecords).values({
          id: d.id,
          bumpingCaseId: d.bumpingCaseId,
          outcome: d.outcome,
          rationale: d.rationale,
          dissentNotes: d.dissentNotes,
          recordedById: d.recordedById,
          recordedAt: new Date(d.recordedAt),
        });
      }
      imported += 1;
    }

    return { imported, removed };
  }
}
