export type BumpingCaseStatus = "open" | "in_review" | "decided" | "closed";

export interface PositionDescription {
  title: string;
  duties: string;
  qualifications: string;
  seniorityNotes: string;
  sourceText?: string;
  fileName?: string;
}

export interface BumpingCase {
  id: string;
  unionId: string;
  localId: string;
  memberRef: string;
  seniorityDate: string;
  currentPosition: string;
  targetPosition: string;
  scenario: string;
  status: BumpingCaseStatus;
  incumbentPosition: PositionDescription;
  bumpingPosition: PositionDescription;
  checklist: ChecklistState;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  labelKey: string;
}

export interface ChecklistState {
  [itemId: string]: boolean | null;
}

export interface CommitteeSession {
  id: string;
  bumpingCaseId: string;
  date: string;
  attendees: string[];
  agenda: string;
  createdById: string;
  createdAt: string;
}

export interface CommitteeNote {
  id: string;
  bumpingCaseId: string;
  sessionId?: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface DecisionRecord {
  id: string;
  bumpingCaseId: string;
  outcome: string;
  rationale: string;
  dissentNotes?: string;
  recordedById: string;
  recordedAt: string;
}

export interface BumpingCaseWithRelations {
  bumpingCase: BumpingCase;
  sessions: CommitteeSession[];
  notes: CommitteeNote[];
  decision: DecisionRecord | null;
}

export interface CreateBumpingCaseInput {
  memberRef: string;
  seniorityDate: string;
  currentPosition: string;
  targetPosition: string;
  scenario: string;
  incumbentPosition: PositionDescription;
  bumpingPosition: PositionDescription;
}

export interface UpdateBumpingCaseInput {
  status?: BumpingCaseStatus;
  incumbentPosition?: PositionDescription;
  bumpingPosition?: PositionDescription;
  checklist?: ChecklistState;
}

export interface CreateSessionInput {
  date: string;
  attendees: string[];
  agenda: string;
}

export interface CreateNoteInput {
  body: string;
  sessionId?: string;
}

export interface CreateDecisionInput {
  outcome: string;
  rationale: string;
  dissentNotes?: string;
}

export interface BumpingListFilters {
  unionId: string;
  localId?: string;
}

export interface DiffLine {
  type: "same" | "added" | "removed" | "changed";
  left?: string;
  right?: string;
}

/**
 * Local seniority roster row — used by the advisory bumping aid only.
 * Does not bind committee decisions; DecisionRecord remains authoritative.
 */
export interface MemberSeniorityRecord {
  id: string;
  unionId: string;
  localId: string;
  memberRef: string;
  /** ISO date string (YYYY-MM-DD). Earlier date = more senior. */
  seniorityDate: string;
  classification: string;
  active: boolean;
}
