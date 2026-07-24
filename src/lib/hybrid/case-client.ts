/**
 * Client data layer for grievance/bumping when Hybrid live-local is active.
 * Falls through to hub `/api/*` otherwise. Server adapters never read localStorage.
 */

import type {
  CreateBumpingCaseInput,
  CreateDecisionInput,
  CreateNoteInput as CreateBumpingNoteInput,
  CreateSessionInput,
  UpdateBumpingCaseInput,
} from "@/types/bumping";
import type {
  CreateGrievanceInput,
  CreateNoteInput,
  UpdateGrievanceInput,
} from "@/types/grievance";
import {
  addBumpingNoteInSlice,
  addBumpingSessionInSlice,
  addGrievanceNoteInSlice,
  createBumpingInSlice,
  createGrievanceInSlice,
  getBumpingFromSlice,
  getGrievanceFromSlice,
  listBumpingFromSlice,
  listGrievancesFromSlice,
  setBumpingDecisionInSlice,
  updateBumpingInSlice,
  updateGrievanceInSlice,
  type EnrichedGrievanceDetail,
  type EnrichedGrievanceListItem,
  type HybridActorContext,
} from "./local-case-store";
import { hybridLocalSliceAdapter } from "./local-slice-adapter";
import {
  getLiveHybridSlice,
  isLiveHybridUnlocked,
  mutateLiveHybridSlice,
} from "./live-session";
import type { BumpingCase, BumpingCaseWithRelations } from "@/types/bumping";
import type { Grievance } from "@/types/grievance";

export type HybridCaseSource = "central" | "local" | "locked";

export async function resolveHybridCaseSource(): Promise<HybridCaseSource> {
  const mode = await hybridLocalSliceAdapter.getDataMode();
  if (mode !== "local") return "central";
  return isLiveHybridUnlocked() ? "local" : "locked";
}

export async function isHybridLiveLocalActive(): Promise<boolean> {
  return (await resolveHybridCaseSource()) === "local";
}

function requireSlice() {
  const slice = getLiveHybridSlice();
  if (!slice) throw new Error("Hybrid live session is not unlocked");
  return slice;
}

export async function listHybridGrievances(): Promise<
  | { source: "local"; grievances: EnrichedGrievanceListItem[] }
  | { source: "central"; grievances: EnrichedGrievanceListItem[] }
  | { source: "locked" }
> {
  const source = await resolveHybridCaseSource();
  if (source === "locked") return { source };
  if (source === "local") {
    return {
      source,
      grievances: listGrievancesFromSlice(requireSlice()),
    };
  }
  const res = await fetch("/api/grievances");
  if (!res.ok) throw new Error("Failed to load grievances");
  const data = (await res.json()) as { grievances: EnrichedGrievanceListItem[] };
  return { source: "central", grievances: data.grievances };
}

export async function getHybridGrievance(
  id: string,
): Promise<
  | { source: "local"; data: EnrichedGrievanceDetail }
  | { source: "central"; data: EnrichedGrievanceDetail }
  | { source: "locked" }
  | { source: "local" | "central"; data: null }
> {
  const source = await resolveHybridCaseSource();
  if (source === "locked") return { source };
  if (source === "local") {
    return { source, data: getGrievanceFromSlice(requireSlice(), id) };
  }
  const res = await fetch(`/api/grievances/${id}`);
  if (!res.ok) return { source: "central", data: null };
  return { source: "central", data: (await res.json()) as EnrichedGrievanceDetail };
}

export async function createHybridGrievance(
  input: CreateGrievanceInput,
  actor: HybridActorContext,
): Promise<{ grievance: Grievance }> {
  if (await isHybridLiveLocalActive()) {
    let created: Grievance | null = null;
    await mutateLiveHybridSlice((draft) => {
      const result = createGrievanceInSlice(draft, input, actor);
      draft.grievances = result.slice.grievances;
      created = result.grievance;
    });
    if (!created) throw new Error("Create failed");
    return { grievance: created };
  }
  const res = await fetch("/api/grievances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Create failed");
  return res.json() as Promise<{ grievance: Grievance }>;
}

export async function updateHybridGrievance(
  id: string,
  input: UpdateGrievanceInput,
): Promise<boolean> {
  if (await isHybridLiveLocalActive()) {
    let ok = false;
    await mutateLiveHybridSlice((draft) => {
      const next = updateGrievanceInSlice(draft, id, input);
      if (!next) return;
      draft.grievances = next.grievances;
      ok = true;
    });
    return ok;
  }
  const res = await fetch(`/api/grievances/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}

export async function addHybridGrievanceNote(
  id: string,
  input: CreateNoteInput,
  actor: HybridActorContext,
): Promise<boolean> {
  if (await isHybridLiveLocalActive()) {
    let ok = false;
    await mutateLiveHybridSlice((draft) => {
      const next = addGrievanceNoteInSlice(draft, id, input, actor);
      if (!next) return;
      draft.grievances = next.grievances;
      ok = true;
    });
    return ok;
  }
  const res = await fetch(`/api/grievances/${id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}

export async function listHybridBumpingCases(): Promise<
  | { source: "local"; cases: BumpingCase[] }
  | { source: "central"; cases: BumpingCase[] }
  | { source: "locked" }
> {
  const source = await resolveHybridCaseSource();
  if (source === "locked") return { source };
  if (source === "local") {
    return { source, cases: listBumpingFromSlice(requireSlice()) };
  }
  const res = await fetch("/api/bumping/cases");
  if (!res.ok) throw new Error("Failed to load bumping cases");
  const data = (await res.json()) as { cases: BumpingCase[] };
  return { source: "central", cases: data.cases };
}

export async function getHybridBumpingCase(
  id: string,
): Promise<
  | { source: "local"; data: BumpingCaseWithRelations }
  | { source: "central"; data: BumpingCaseWithRelations }
  | { source: "locked" }
  | { source: "local" | "central"; data: null }
> {
  const source = await resolveHybridCaseSource();
  if (source === "locked") return { source };
  if (source === "local") {
    return { source, data: getBumpingFromSlice(requireSlice(), id) };
  }
  const res = await fetch(`/api/bumping/cases/${id}`);
  if (!res.ok) return { source: "central", data: null };
  return {
    source: "central",
    data: (await res.json()) as BumpingCaseWithRelations,
  };
}

export async function createHybridBumpingCase(
  input: CreateBumpingCaseInput,
  actor: HybridActorContext,
): Promise<{ bumpingCase: BumpingCase }> {
  if (await isHybridLiveLocalActive()) {
    let created: BumpingCase | null = null;
    await mutateLiveHybridSlice((draft) => {
      const result = createBumpingInSlice(draft, input, actor);
      draft.bumpingCases = result.slice.bumpingCases;
      created = result.bumpingCase;
    });
    if (!created) throw new Error("Create failed");
    return { bumpingCase: created };
  }
  const res = await fetch("/api/bumping/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Create failed");
  return res.json() as Promise<{ bumpingCase: BumpingCase }>;
}

export async function updateHybridBumpingCase(
  id: string,
  input: UpdateBumpingCaseInput,
): Promise<boolean> {
  if (await isHybridLiveLocalActive()) {
    let ok = false;
    await mutateLiveHybridSlice((draft) => {
      const next = updateBumpingInSlice(draft, id, input);
      if (!next) return;
      draft.bumpingCases = next.bumpingCases;
      ok = true;
    });
    return ok;
  }
  const res = await fetch(`/api/bumping/cases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}

export async function addHybridBumpingNote(
  id: string,
  input: CreateBumpingNoteInput,
  actor: HybridActorContext,
): Promise<boolean> {
  if (await isHybridLiveLocalActive()) {
    let ok = false;
    await mutateLiveHybridSlice((draft) => {
      const next = addBumpingNoteInSlice(draft, id, input, actor);
      if (!next) return;
      draft.bumpingCases = next.bumpingCases;
      ok = true;
    });
    return ok;
  }
  const res = await fetch(`/api/bumping/cases/${id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}

export async function addHybridBumpingSession(
  id: string,
  input: CreateSessionInput,
  actor: HybridActorContext,
): Promise<boolean> {
  if (await isHybridLiveLocalActive()) {
    let ok = false;
    await mutateLiveHybridSlice((draft) => {
      const next = addBumpingSessionInSlice(draft, id, input, actor);
      if (!next) return;
      draft.bumpingCases = next.bumpingCases;
      ok = true;
    });
    return ok;
  }
  const res = await fetch(`/api/bumping/cases/${id}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}

export async function setHybridBumpingDecision(
  id: string,
  input: CreateDecisionInput,
  actor: HybridActorContext,
): Promise<boolean> {
  if (await isHybridLiveLocalActive()) {
    let ok = false;
    await mutateLiveHybridSlice((draft) => {
      const next = setBumpingDecisionInSlice(draft, id, input, actor);
      if (!next) return;
      draft.bumpingCases = next.bumpingCases;
      ok = true;
    });
    return ok;
  }
  const res = await fetch(`/api/bumping/cases/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}
