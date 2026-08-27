import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";
import {
  PROPOSAL_STATUSES,
  type ProposalRow,
  type ProposalStatus,
  type ProposalTrackerDraft,
} from "./types";

export const PROPOSAL_TRACKER_STORAGE_KEY =
  "unionops.proposal-tracker.draft.v1";

export function newProposalRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyProposalRow(): ProposalRow {
  return {
    id: newProposalRowId(),
    article: "",
    currentLanguage: "",
    unionProposal: "",
    employerCounter: "",
    status: "open",
    notes: "",
  };
}

export function createEmptyProposalTrackerDraft(): ProposalTrackerDraft {
  return { rows: [createEmptyProposalRow()] };
}

function isProposalStatus(v: unknown): v is ProposalStatus {
  return (
    typeof v === "string" &&
    (PROPOSAL_STATUSES as readonly string[]).includes(v)
  );
}

function isProposalRow(v: unknown): v is ProposalRow {
  if (!v || typeof v !== "object") return false;
  const row = v as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.article === "string" &&
    typeof row.currentLanguage === "string" &&
    typeof row.unionProposal === "string" &&
    typeof row.employerCounter === "string" &&
    isProposalStatus(row.status) &&
    typeof row.notes === "string"
  );
}

export function isProposalTrackerDraft(
  v: unknown,
): v is ProposalTrackerDraft {
  if (!v || typeof v !== "object") return false;
  const draft = v as Record<string, unknown>;
  return Array.isArray(draft.rows) && draft.rows.every(isProposalRow);
}

export function loadProposalTrackerDraft(): ProposalTrackerDraft | null {
  return loadJsonDraft(PROPOSAL_TRACKER_STORAGE_KEY, isProposalTrackerDraft);
}

export function saveProposalTrackerDraft(
  draft: ProposalTrackerDraft,
): boolean {
  return saveJsonDraft(PROPOSAL_TRACKER_STORAGE_KEY, draft);
}

export function clearProposalTrackerDraft(): boolean {
  return clearJsonDraft(PROPOSAL_TRACKER_STORAGE_KEY);
}
