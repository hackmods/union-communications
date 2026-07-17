import type { GrievanceAdapter } from "./adapter";
import type {
  CreateEventInput,
  CreateGrievanceInput,
  CreateNoteInput,
  Grievance,
  GrievanceEvent,
  GrievanceListFilters,
  GrievanceNote,
  GrievanceWithRelations,
  UpdateGrievanceInput,
} from "@/types/grievance";
import type {
  CreateCommunicationInput,
  CreateMeetingInput,
  MemberCommunication,
  ScheduledMeeting,
} from "@/types/qol";

const grievances: Grievance[] = [
  {
    id: "grev-001",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    memberPseudonym: "Member A",
    category: "Contract interpretation",
    status: "in_progress",
    currentStep: 1,
    filedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignedStewardId: "user-steward-243",
    createdById: "user-president-243",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grev-002",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-pt",
    memberPseudonym: "Member B",
    category: "Discipline",
    status: "open",
    currentStep: 2,
    filedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    assignedStewardId: "user-steward-243-pt",
    createdById: "user-president-243",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grev-003",
    unionId: "union-opseu",
    localId: "local-560",
    bargainingUnitId: "bu-560-ft",
    memberPseudonym: "Member C",
    category: "Hours of work",
    status: "open",
    currentStep: 1,
    filedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedStewardId: "user-division-admin",
    createdById: "user-division-admin",
    updatedAt: new Date().toISOString(),
  },
];

const events: GrievanceEvent[] = [
  {
    id: "evt-001",
    grievanceId: "grev-001",
    type: "step_filed",
    stepNumber: 1,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "evt-002",
    grievanceId: "grev-002",
    type: "step_filed",
    stepNumber: 1,
    completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "evt-003",
    grievanceId: "grev-002",
    type: "escalation",
    stepNumber: 2,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const notes: GrievanceNote[] = [
  {
    id: "note-001",
    grievanceId: "grev-001",
    authorId: "user-steward-243",
    authorName: "Local 243 Steward",
    body: "Initial meeting scheduled with member. Awaiting management response.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const communications: MemberCommunication[] = [
  {
    id: "comm-001",
    grievanceId: "grev-001",
    unionId: "union-opseu",
    localId: "local-243",
    channel: "phone",
    direction: "outbound",
    summary: "Called member to confirm facts and next steps for Step 1.",
    occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    loggedById: "user-steward-243",
    loggedByName: "Local 243 Steward",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const meetings: ScheduledMeeting[] = [];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MemoryGrievanceAdapter implements GrievanceAdapter {
  async list(filters: GrievanceListFilters): Promise<Grievance[]> {
    let results = grievances.filter((g) => g.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((g) => g.localId === filters.localId);
    }
    if (filters.bargainingUnitId) {
      results = results.filter(
        (g) =>
          !g.bargainingUnitId ||
          g.bargainingUnitId === filters.bargainingUnitId,
      );
    }
    if (filters.assignedStewardId) {
      results = results.filter(
        (g) => g.assignedStewardId === filters.assignedStewardId,
      );
    }
    if (filters.status) {
      results = results.filter((g) => g.status === filters.status);
    }
    return results.sort(
      (a, b) => new Date(b.filedAt).getTime() - new Date(a.filedAt).getTime(),
    );
  }

  async getById(grievanceId: string): Promise<GrievanceWithRelations | null> {
    const grievance = grievances.find((g) => g.id === grievanceId);
    if (!grievance) return null;
    return {
      grievance,
      events: events
        .filter((e) => e.grievanceId === grievanceId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      notes: notes
        .filter((n) => n.grievanceId === grievanceId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      communications: communications
        .filter((c) => c.grievanceId === grievanceId)
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        ),
      meetings: meetings
        .filter((m) => m.grievanceId === grievanceId)
        .sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
        ),
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
    const now = new Date().toISOString();
    const grievance: Grievance = {
      id: id("grev"),
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId ?? meta.bargainingUnitId,
      memberPseudonym: input.memberPseudonym,
      category: input.category,
      status: "open",
      currentStep: 1,
      filedAt: input.filedAt,
      assignedStewardId: meta.assignedStewardId,
      createdById: meta.createdById,
      updatedAt: now,
    };
    grievances.push(grievance);

    const event: GrievanceEvent = {
      id: id("evt"),
      grievanceId: grievance.id,
      type: "step_filed",
      stepNumber: 1,
      createdAt: now,
    };
    events.push(event);

    return {
      grievance,
      events: [event],
      notes: [],
      communications: [],
      meetings: [],
    };
  }

  async update(
    grievanceId: string,
    input: UpdateGrievanceInput,
  ): Promise<Grievance | null> {
    const idx = grievances.findIndex((g) => g.id === grievanceId);
    if (idx === -1) return null;

    const existing = grievances[idx];
    const updated: Grievance = {
      ...existing,
      ...input,
      bargainingUnitId:
        input.bargainingUnitId === null
          ? undefined
          : (input.bargainingUnitId ?? existing.bargainingUnitId),
      resolvedAt:
        input.resolvedAt === null
          ? undefined
          : (input.resolvedAt ?? existing.resolvedAt),
      updatedAt: new Date().toISOString(),
    };
    grievances[idx] = updated;
    return updated;
  }

  async addNote(
    grievanceId: string,
    input: CreateNoteInput,
    meta: { authorId: string; authorName: string },
  ): Promise<GrievanceNote | null> {
    if (!grievances.some((g) => g.id === grievanceId)) return null;
    const note: GrievanceNote = {
      id: id("note"),
      grievanceId,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    notes.push(note);
    return note;
  }

  async addEvent(
    grievanceId: string,
    input: CreateEventInput,
  ): Promise<GrievanceEvent | null> {
    if (!grievances.some((g) => g.id === grievanceId)) return null;
    const event: GrievanceEvent = {
      id: id("evt"),
      grievanceId,
      type: input.type,
      stepNumber: input.stepNumber,
      dueAt: input.dueAt,
      completedAt: input.completedAt,
      note: input.note,
      createdAt: new Date().toISOString(),
    };
    events.push(event);
    return event;
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
    if (!grievances.some((g) => g.id === grievanceId)) return null;
    const entry: MemberCommunication = {
      id: id("comm"),
      grievanceId,
      unionId: meta.unionId,
      localId: meta.localId,
      channel: input.channel,
      direction: input.direction,
      summary: input.summary,
      occurredAt: input.occurredAt,
      loggedById: meta.loggedById,
      loggedByName: meta.loggedByName,
      createdAt: new Date().toISOString(),
    };
    communications.push(entry);
    return entry;
  }

  async listCommunications(
    grievanceId: string,
  ): Promise<MemberCommunication[]> {
    return communications
      .filter((c) => c.grievanceId === grievanceId)
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );
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
    if (!grievances.some((g) => g.id === grievanceId)) return null;
    const meeting: ScheduledMeeting = {
      id: id("meet"),
      grievanceId,
      unionId: meta.unionId,
      localId: meta.localId,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location,
      description: input.description,
      createdById: meta.createdById,
      createdAt: new Date().toISOString(),
    };
    meetings.push(meeting);
    await this.addEvent(grievanceId, {
      type: "meeting_scheduled",
      dueAt: input.startsAt,
      note: `${input.title}${input.location ? ` @ ${input.location}` : ""}`,
    });
    return meeting;
  }

  async listMeetings(grievanceId: string): Promise<ScheduledMeeting[]> {
    return meetings
      .filter((m) => m.grievanceId === grievanceId)
      .sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      );
  }

  async importLocalSlice(
    unionId: string,
    localId: string,
    items: GrievanceWithRelations[],
    mode: "merge" | "replace",
  ): Promise<{ imported: number; removed: number }> {
    let removed = 0;

    if (mode === "replace") {
      const removeIds = new Set(
        grievances
          .filter((g) => g.unionId === unionId && g.localId === localId)
          .map((g) => g.id),
      );
      removed = removeIds.size;
      for (let i = grievances.length - 1; i >= 0; i--) {
        if (removeIds.has(grievances[i].id)) grievances.splice(i, 1);
      }
      for (let i = events.length - 1; i >= 0; i--) {
        if (removeIds.has(events[i].grievanceId)) events.splice(i, 1);
      }
      for (let i = notes.length - 1; i >= 0; i--) {
        if (removeIds.has(notes[i].grievanceId)) notes.splice(i, 1);
      }
      for (let i = communications.length - 1; i >= 0; i--) {
        if (removeIds.has(communications[i].grievanceId)) {
          communications.splice(i, 1);
        }
      }
      for (let i = meetings.length - 1; i >= 0; i--) {
        if (removeIds.has(meetings[i].grievanceId)) meetings.splice(i, 1);
      }
    }

    let imported = 0;
    for (const item of items) {
      const g = item.grievance;
      if (g.unionId !== unionId || g.localId !== localId) continue;

      const idx = grievances.findIndex((x) => x.id === g.id);
      if (idx >= 0) {
        grievances[idx] = { ...g };
        for (let i = events.length - 1; i >= 0; i--) {
          if (events[i].grievanceId === g.id) events.splice(i, 1);
        }
        for (let i = notes.length - 1; i >= 0; i--) {
          if (notes[i].grievanceId === g.id) notes.splice(i, 1);
        }
        for (let i = communications.length - 1; i >= 0; i--) {
          if (communications[i].grievanceId === g.id) {
            communications.splice(i, 1);
          }
        }
        for (let i = meetings.length - 1; i >= 0; i--) {
          if (meetings[i].grievanceId === g.id) meetings.splice(i, 1);
        }
      } else {
        grievances.push({ ...g });
      }
      events.push(...item.events.map((e) => ({ ...e })));
      notes.push(...item.notes.map((n) => ({ ...n })));
      if (item.communications) {
        communications.push(...item.communications.map((c) => ({ ...c })));
      }
      if (item.meetings) {
        meetings.push(...item.meetings.map((m) => ({ ...m })));
      }
      imported += 1;
    }

    return { imported, removed };
  }
}

export const grievanceStore: GrievanceAdapter = new MemoryGrievanceAdapter();
