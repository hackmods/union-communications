/**
 * Pure CRUD against a HybridDataSlice (client-only live-local path).
 */

import { emptyChecklistState } from "@/lib/bumping/checklist";
import { getCurrentStepDueDate, isOverdue } from "@/lib/grievance/deadlines";
import {
  getLocalById,
  getTenantContext,
  resolveGrievanceConfig,
} from "@/lib/tenant/loader";
import type {
  BumpingCase,
  BumpingCaseWithRelations,
  CommitteeNote,
  CommitteeSession,
  CreateBumpingCaseInput,
  CreateDecisionInput,
  CreateNoteInput as CreateBumpingNoteInput,
  CreateSessionInput,
  DecisionRecord,
  UpdateBumpingCaseInput,
} from "@/types/bumping";
import type {
  CreateGrievanceInput,
  CreateNoteInput,
  Grievance,
  GrievanceNote,
  GrievanceWithRelations,
  UpdateGrievanceInput,
} from "@/types/grievance";
import type { GrievanceConfig } from "@/types/tenant";
import type { HybridDataSlice } from "./types";

export type HybridActorContext = {
  unionId: string;
  localId: string;
  userId: string;
  authorName: string;
};

export type EnrichedGrievanceListItem = Grievance & {
  dueAt: string | null;
  isOverdue: boolean;
};

export type EnrichedGrievanceDetail = GrievanceWithRelations & {
  dueAt: string | null;
  isOverdue: boolean;
  grievanceConfig: GrievanceConfig | null;
  localNumber?: string;
};

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function enrichGrievance(g: Grievance): EnrichedGrievanceListItem {
  const config = resolveGrievanceConfig(g.unionId, {
    bargainingUnitId: g.bargainingUnitId,
    localId: g.localId,
  });
  const due =
    config && getCurrentStepDueDate(g.filedAt, g.currentStep, config);
  return {
    ...g,
    dueAt: due?.toISOString() ?? null,
    isOverdue: due
      ? due.getTime() < Date.now() && g.status !== "resolved"
      : false,
  };
}

export function listGrievancesFromSlice(
  slice: HybridDataSlice,
): EnrichedGrievanceListItem[] {
  return slice.grievances.map((item) => enrichGrievance(item.grievance));
}

export function getGrievanceFromSlice(
  slice: HybridDataSlice,
  id: string,
): EnrichedGrievanceDetail | null {
  const item = slice.grievances.find((g) => g.grievance.id === id);
  if (!item) return null;
  const tenant = getTenantContext(item.grievance.unionId);
  const config =
    resolveGrievanceConfig(item.grievance.unionId, {
      bargainingUnitId: item.grievance.bargainingUnitId,
      localId: item.grievance.localId,
    }) ??
    tenant?.grievanceConfig ??
    null;
  const due =
    config &&
    getCurrentStepDueDate(
      item.grievance.filedAt,
      item.grievance.currentStep,
      config,
    );
  return {
    ...item,
    dueAt: due?.toISOString() ?? null,
    isOverdue:
      due != null &&
      item.grievance.status !== "resolved" &&
      isOverdue(due),
    grievanceConfig: config,
    localNumber: getLocalById(item.grievance.unionId, item.grievance.localId)
      ?.localNumber,
  };
}

export function createGrievanceInSlice(
  slice: HybridDataSlice,
  input: CreateGrievanceInput,
  actor: HybridActorContext,
): { slice: HybridDataSlice; grievance: Grievance } {
  const now = new Date().toISOString();
  const grievance: Grievance = {
    id: newId("grev-local"),
    unionId: actor.unionId,
    localId: actor.localId,
    bargainingUnitId: input.bargainingUnitId,
    memberPseudonym: input.memberPseudonym,
    category: input.category,
    status: "open",
    currentStep: 1,
    filedAt: input.filedAt,
    assignedStewardId: input.assignedStewardId ?? actor.userId,
    createdById: actor.userId,
    updatedAt: now,
  };
  const row: GrievanceWithRelations = {
    grievance,
    events: [
      {
        id: newId("evt-local"),
        grievanceId: grievance.id,
        type: "step_filed",
        stepNumber: 1,
        createdAt: now,
      },
    ],
    notes: [],
    communications: [],
    meetings: [],
  };
  return {
    slice: {
      ...slice,
      grievances: [...slice.grievances, row],
    },
    grievance,
  };
}

export function updateGrievanceInSlice(
  slice: HybridDataSlice,
  id: string,
  input: UpdateGrievanceInput,
): HybridDataSlice | null {
  const idx = slice.grievances.findIndex((g) => g.grievance.id === id);
  if (idx < 0) return null;
  const existing = slice.grievances[idx];
  const now = new Date().toISOString();
  const grievance: Grievance = {
    ...existing.grievance,
    ...("status" in input && input.status !== undefined
      ? { status: input.status }
      : {}),
    ...("currentStep" in input && input.currentStep !== undefined
      ? { currentStep: input.currentStep }
      : {}),
    ...("memberPseudonym" in input
      ? { memberPseudonym: input.memberPseudonym }
      : {}),
    ...("category" in input && input.category !== undefined
      ? { category: input.category }
      : {}),
    ...("assignedStewardId" in input && input.assignedStewardId !== undefined
      ? { assignedStewardId: input.assignedStewardId }
      : {}),
    ...("bargainingUnitId" in input
      ? {
          bargainingUnitId:
            input.bargainingUnitId === null
              ? undefined
              : input.bargainingUnitId,
        }
      : {}),
    ...("resolvedAt" in input
      ? {
          resolvedAt:
            input.resolvedAt === null ? undefined : input.resolvedAt,
        }
      : {}),
    updatedAt: now,
  };
  const next = [...slice.grievances];
  next[idx] = { ...existing, grievance };
  return { ...slice, grievances: next };
}

export function addGrievanceNoteInSlice(
  slice: HybridDataSlice,
  id: string,
  input: CreateNoteInput,
  actor: HybridActorContext,
): HybridDataSlice | null {
  const idx = slice.grievances.findIndex((g) => g.grievance.id === id);
  if (idx < 0) return null;
  const existing = slice.grievances[idx];
  const note: GrievanceNote = {
    id: newId("note-local"),
    grievanceId: id,
    authorId: actor.userId,
    authorName: actor.authorName,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  const next = [...slice.grievances];
  next[idx] = {
    ...existing,
    notes: [...existing.notes, note],
    grievance: {
      ...existing.grievance,
      updatedAt: note.createdAt,
    },
  };
  return { ...slice, grievances: next };
}

export function listBumpingFromSlice(slice: HybridDataSlice): BumpingCase[] {
  return slice.bumpingCases.map((c) => c.bumpingCase);
}

export function getBumpingFromSlice(
  slice: HybridDataSlice,
  id: string,
): BumpingCaseWithRelations | null {
  return slice.bumpingCases.find((c) => c.bumpingCase.id === id) ?? null;
}

export function createBumpingInSlice(
  slice: HybridDataSlice,
  input: CreateBumpingCaseInput,
  actor: HybridActorContext,
): { slice: HybridDataSlice; bumpingCase: BumpingCase } {
  const now = new Date().toISOString();
  const bumpingCase: BumpingCase = {
    id: newId("bump-local"),
    unionId: actor.unionId,
    localId: actor.localId,
    memberRef: input.memberRef,
    seniorityDate: input.seniorityDate,
    currentPosition: input.currentPosition,
    targetPosition: input.targetPosition,
    scenario: input.scenario,
    status: "open",
    incumbentPosition: input.incumbentPosition,
    bumpingPosition: input.bumpingPosition,
    checklist: emptyChecklistState(),
    createdById: actor.userId,
    createdAt: now,
    updatedAt: now,
  };
  const row: BumpingCaseWithRelations = {
    bumpingCase,
    sessions: [],
    notes: [],
    decision: null,
  };
  return {
    slice: {
      ...slice,
      bumpingCases: [...slice.bumpingCases, row],
    },
    bumpingCase,
  };
}

export function updateBumpingInSlice(
  slice: HybridDataSlice,
  id: string,
  input: UpdateBumpingCaseInput,
): HybridDataSlice | null {
  const idx = slice.bumpingCases.findIndex((c) => c.bumpingCase.id === id);
  if (idx < 0) return null;
  const existing = slice.bumpingCases[idx];
  const now = new Date().toISOString();
  const bumpingCase: BumpingCase = {
    ...existing.bumpingCase,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.incumbentPosition !== undefined
      ? { incumbentPosition: input.incumbentPosition }
      : {}),
    ...(input.bumpingPosition !== undefined
      ? { bumpingPosition: input.bumpingPosition }
      : {}),
    ...(input.checklist !== undefined ? { checklist: input.checklist } : {}),
    updatedAt: now,
  };
  const next = [...slice.bumpingCases];
  next[idx] = { ...existing, bumpingCase };
  return { ...slice, bumpingCases: next };
}

export function addBumpingNoteInSlice(
  slice: HybridDataSlice,
  id: string,
  input: CreateBumpingNoteInput,
  actor: HybridActorContext,
): HybridDataSlice | null {
  const idx = slice.bumpingCases.findIndex((c) => c.bumpingCase.id === id);
  if (idx < 0) return null;
  const existing = slice.bumpingCases[idx];
  const note: CommitteeNote = {
    id: newId("cnote-local"),
    bumpingCaseId: id,
    sessionId: input.sessionId,
    authorId: actor.userId,
    authorName: actor.authorName,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  const next = [...slice.bumpingCases];
  next[idx] = {
    ...existing,
    notes: [...existing.notes, note],
    bumpingCase: { ...existing.bumpingCase, updatedAt: note.createdAt },
  };
  return { ...slice, bumpingCases: next };
}

export function addBumpingSessionInSlice(
  slice: HybridDataSlice,
  id: string,
  input: CreateSessionInput,
  actor: HybridActorContext,
): HybridDataSlice | null {
  const idx = slice.bumpingCases.findIndex((c) => c.bumpingCase.id === id);
  if (idx < 0) return null;
  const existing = slice.bumpingCases[idx];
  const now = new Date().toISOString();
  const committeeSession: CommitteeSession = {
    id: newId("sess-local"),
    bumpingCaseId: id,
    date: input.date,
    attendees: input.attendees,
    agenda: input.agenda,
    createdById: actor.userId,
    createdAt: now,
  };
  const next = [...slice.bumpingCases];
  next[idx] = {
    ...existing,
    sessions: [...existing.sessions, committeeSession],
    bumpingCase: { ...existing.bumpingCase, updatedAt: now },
  };
  return { ...slice, bumpingCases: next };
}

export function setBumpingDecisionInSlice(
  slice: HybridDataSlice,
  id: string,
  input: CreateDecisionInput,
  actor: HybridActorContext,
): HybridDataSlice | null {
  const idx = slice.bumpingCases.findIndex((c) => c.bumpingCase.id === id);
  if (idx < 0) return null;
  const existing = slice.bumpingCases[idx];
  const recordedAt = new Date().toISOString();
  const decision: DecisionRecord = {
    id: newId("dec-local"),
    bumpingCaseId: id,
    outcome: input.outcome,
    rationale: input.rationale,
    dissentNotes: input.dissentNotes,
    recordedById: actor.userId,
    recordedAt,
  };
  const next = [...slice.bumpingCases];
  next[idx] = {
    ...existing,
    decision,
    bumpingCase: {
      ...existing.bumpingCase,
      status: "decided",
      updatedAt: recordedAt,
    },
  };
  return { ...slice, bumpingCases: next };
}
