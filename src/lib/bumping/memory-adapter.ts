import type { BumpingAdapter } from "./adapter";
import { emptyChecklistState } from "./checklist";
import type {
  BumpingCase,
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

const cases: BumpingCase[] = [
  {
    id: "bump-001",
    unionId: "union-opseu",
    localId: "local-243",
    memberRef: "Member C",
    seniorityDate: "2018-09-01",
    currentPosition: "Administrative Assistant II",
    targetPosition: "Administrative Assistant I (vacant)",
    scenario: "Layoff bump — member exercises seniority into lower classification",
    status: "in_review",
    incumbentPosition: {
      title: "Administrative Assistant I",
      duties:
        "Provides administrative support including scheduling, correspondence, and records management.",
      qualifications: "College diploma in office administration or equivalent experience.",
      seniorityNotes: "Incumbent hired 2020-03-15",
      sourceText:
        "Administrative Assistant I\nDuties: scheduling, correspondence, records.\nQualifications: college diploma.",
    },
    bumpingPosition: {
      title: "Administrative Assistant II",
      duties:
        "Provides senior administrative support including budget tracking, committee coordination, and supervisory tasks.",
      qualifications:
        "College diploma plus 3 years experience in administrative role.",
      seniorityNotes: "Bumping member seniority 2018-09-01",
      sourceText:
        "Administrative Assistant II\nDuties: budget tracking, committee coordination, supervisory tasks.\nQualifications: diploma + 3 years.",
    },
    checklist: {
      seniority_verified: true,
      duties_compared: true,
      qualifications_compared: null,
      ca_article_cited: true,
      member_notified: true,
      incumbent_notified: null,
    },
    createdById: "user-president-243",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const sessions: CommitteeSession[] = [
  {
    id: "sess-001",
    bumpingCaseId: "bump-001",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    attendees: ["Local President", "Stability Rep A", "Stability Rep B"],
    agenda: "Review position descriptions and seniority for AA II → AA I bump scenario",
    createdById: "user-president-243",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const notes: CommitteeNote[] = [
  {
    id: "cnote-001",
    bumpingCaseId: "bump-001",
    sessionId: "sess-001",
    authorId: "user-president-243",
    authorName: "Local 243 President",
    body: "Committee reviewed PDF position descriptions. Duties differ on budget/supervisory tasks — need HR clarification.",
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const decisions: DecisionRecord[] = [];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MemoryBumpingAdapter implements BumpingAdapter {
  async list(filters: BumpingListFilters): Promise<BumpingCase[]> {
    let results = cases.filter((c) => c.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((c) => c.localId === filters.localId);
    }
    return results.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async getById(caseId: string): Promise<BumpingCaseWithRelations | null> {
    const bumpingCase = cases.find((c) => c.id === caseId);
    if (!bumpingCase) return null;
    return {
      bumpingCase,
      sessions: sessions
        .filter((s) => s.bumpingCaseId === caseId)
        .sort((a, b) => b.date.localeCompare(a.date)),
      notes: notes
        .filter((n) => n.bumpingCaseId === caseId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      decision: decisions.find((d) => d.bumpingCaseId === caseId) ?? null,
    };
  }

  async create(
    input: CreateBumpingCaseInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<BumpingCaseWithRelations> {
    const now = new Date().toISOString();
    const bumpingCase: BumpingCase = {
      id: id("bump"),
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
    };
    cases.push(bumpingCase);
    return { bumpingCase, sessions: [], notes: [], decision: null };
  }

  async update(
    caseId: string,
    input: UpdateBumpingCaseInput,
  ): Promise<BumpingCase | null> {
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return null;
    cases[idx] = {
      ...cases[idx],
      ...input,
      incumbentPosition: input.incumbentPosition ?? cases[idx].incumbentPosition,
      bumpingPosition: input.bumpingPosition ?? cases[idx].bumpingPosition,
      checklist: input.checklist ?? cases[idx].checklist,
      updatedAt: new Date().toISOString(),
    };
    return cases[idx];
  }

  async addSession(
    caseId: string,
    input: CreateSessionInput,
    meta: { createdById: string },
  ): Promise<CommitteeSession | null> {
    if (!cases.some((c) => c.id === caseId)) return null;
    const session: CommitteeSession = {
      id: id("sess"),
      bumpingCaseId: caseId,
      date: input.date,
      attendees: input.attendees,
      agenda: input.agenda,
      createdById: meta.createdById,
      createdAt: new Date().toISOString(),
    };
    sessions.push(session);
    return session;
  }

  async addNote(
    caseId: string,
    input: CreateNoteInput,
    meta: { authorId: string; authorName: string },
  ): Promise<CommitteeNote | null> {
    if (!cases.some((c) => c.id === caseId)) return null;
    const note: CommitteeNote = {
      id: id("cnote"),
      bumpingCaseId: caseId,
      sessionId: input.sessionId,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    notes.push(note);
    return note;
  }

  async recordDecision(
    caseId: string,
    input: CreateDecisionInput,
    meta: { recordedById: string },
  ): Promise<DecisionRecord | null> {
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return null;

    const existing = decisions.findIndex((d) => d.bumpingCaseId === caseId);
    const record: DecisionRecord = {
      id: id("dec"),
      bumpingCaseId: caseId,
      outcome: input.outcome,
      rationale: input.rationale,
      dissentNotes: input.dissentNotes,
      recordedById: meta.recordedById,
      recordedAt: new Date().toISOString(),
    };

    if (existing >= 0) {
      decisions[existing] = record;
    } else {
      decisions.push(record);
    }

    cases[idx] = {
      ...cases[idx],
      status: "decided",
      updatedAt: new Date().toISOString(),
    };

    return record;
  }
}

export const bumpingStore: BumpingAdapter = new MemoryBumpingAdapter();
