export type GrievanceStatus =
  | "open"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "withdrawn";

export type GrievanceWorkflowStage = "intake" | "formal";

export type GrievanceType = "individual" | "group" | "policy";

export type GrievanceEventType =
  | "step_filed"
  | "response_received"
  | "meeting_scheduled"
  | "deadline"
  | "escalation"
  | "resolution";

export type EmailTemplateId =
  | "step1_meeting"
  | "extension_request"
  | "member_update";

/** 5W+H + remedy fact sheet captured during intake. */
export interface GrievanceIntake {
  who?: string;
  what?: string;
  when?: string;
  where?: string;
  why?: string;
  how?: string;
  remedy?: string;
}

/** Snapshot of a clause library snippet linked to a case. */
export interface GrievanceLinkedSnippet {
  snippetId: string;
  clauseRef: string;
  title: string;
  bodySnapshot: string;
}

export interface Grievance {
  id: string;
  unionId: string;
  localId: string;
  /** Optional CA collection (FT/PT Support Staff, etc.) */
  bargainingUnitId?: string;
  memberPseudonym?: string;
  memberUserId?: string;
  privacyMode?: "standard" | "restricted";
  category: string;
  status: GrievanceStatus;
  currentStep: number;
  filedAt: string;
  resolvedAt?: string;
  assignedStewardId: string;
  createdById: string;
  updatedAt: string;
  /**
   * Intake vs formal CA step track. Required on the type; existing / seed
   * rows are treated as `"formal"`.
   */
  workflowStage: GrievanceWorkflowStage;
  /** Human-facing file id, e.g. `GRV-2026-0001`. Unique per unionId+localId. */
  fileNumber?: string;
  grievanceType?: GrievanceType;
  memberNames?: string[];
  summary?: string;
  intake?: GrievanceIntake;
  linkedSnippets?: GrievanceLinkedSnippet[];
  /** Brand Kit local display snapshot at create/update time. */
  localLabel?: string;
  /** Brand Kit collection / unit display snapshot. */
  unitLabel?: string;
}

export interface GrievanceEvent {
  id: string;
  grievanceId: string;
  type: GrievanceEventType;
  stepNumber?: number;
  dueAt?: string;
  completedAt?: string;
  note?: string;
  createdAt: string;
}

export interface GrievanceNote {
  id: string;
  grievanceId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export type GrievanceOutcomeType =
  | "upheld"
  | "denied"
  | "settled"
  | "withdrawn";

/** Optional 1:1 arbitration / settlement outcome for a grievance (FEAT-004). */
export interface GrievanceOutcome {
  id: string;
  grievanceId: string;
  outcomeType: GrievanceOutcomeType;
  remedy?: string;
  settlementTerms?: string;
  arbitratorName?: string;
  mediatorName?: string;
  hearingDate?: string;
  decidedAt: string;
  recordedById: string;
  sentToArbitration?: boolean;
  sentToArbitrationAt?: string;
}

export interface GrievanceWithRelations {
  grievance: Grievance;
  events: GrievanceEvent[];
  notes: GrievanceNote[];
  communications?: import("@/types/qol").MemberCommunication[];
  meetings?: import("@/types/qol").ScheduledMeeting[];
}

export interface CreateGrievanceInput {
  memberPseudonym?: string;
  memberUserId?: string;
  privacyMode?: "standard" | "restricted";
  category: string;
  filedAt: string;
  assignedStewardId?: string;
  bargainingUnitId?: string;
  workflowStage?: GrievanceWorkflowStage;
  fileNumber?: string;
  grievanceType?: GrievanceType;
  memberNames?: string[];
  summary?: string;
  intake?: GrievanceIntake;
  linkedSnippets?: GrievanceLinkedSnippet[];
  localLabel?: string;
  unitLabel?: string;
}

export interface UpdateGrievanceInput {
  status?: GrievanceStatus;
  currentStep?: number;
  memberPseudonym?: string;
  privacyMode?: "standard" | "restricted";
  category?: string;
  assignedStewardId?: string;
  bargainingUnitId?: string | null;
  resolvedAt?: string | null;
  workflowStage?: GrievanceWorkflowStage;
  fileNumber?: string;
  grievanceType?: GrievanceType | null;
  memberNames?: string[] | null;
  summary?: string | null;
  intake?: GrievanceIntake | null;
  linkedSnippets?: GrievanceLinkedSnippet[] | null;
  localLabel?: string | null;
  unitLabel?: string | null;
}

export interface CreateNoteInput {
  body: string;
}

export interface CreateGrievanceOutcomeInput {
  outcomeType: GrievanceOutcomeType;
  remedy?: string;
  settlementTerms?: string;
  arbitratorName?: string;
  mediatorName?: string;
  hearingDate?: string;
  decidedAt: string;
  sentToArbitration?: boolean;
  sentToArbitrationAt?: string;
}

export interface CreateEventInput {
  type: GrievanceEventType;
  stepNumber?: number;
  dueAt?: string;
  completedAt?: string;
  note?: string;
}

export interface GrievanceListFilters {
  unionId: string;
  localId?: string;
  bargainingUnitId?: string;
  assignedStewardId?: string;
  participantUserId?: string;
  memberUserId?: string;
  status?: GrievanceStatus;
}

export interface EmailDraft {
  templateId: EmailTemplateId;
  locale: "en" | "fr";
  subject: string;
  body: string;
}
