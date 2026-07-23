export type GrievanceStatus =
  | "open"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "withdrawn";

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

export interface Grievance {
  id: string;
  unionId: string;
  localId: string;
  /** Optional CA collection (FT/PT Support Staff, etc.) */
  bargainingUnitId?: string;
  memberPseudonym?: string;
  category: string;
  status: GrievanceStatus;
  currentStep: number;
  filedAt: string;
  resolvedAt?: string;
  assignedStewardId: string;
  createdById: string;
  updatedAt: string;
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
  hearingDate?: string;
  decidedAt: string;
  recordedById: string;
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
  category: string;
  filedAt: string;
  assignedStewardId?: string;
  bargainingUnitId?: string;
}

export interface UpdateGrievanceInput {
  status?: GrievanceStatus;
  currentStep?: number;
  memberPseudonym?: string;
  category?: string;
  assignedStewardId?: string;
  bargainingUnitId?: string | null;
  resolvedAt?: string | null;
}

export interface CreateNoteInput {
  body: string;
}

export interface CreateGrievanceOutcomeInput {
  outcomeType: GrievanceOutcomeType;
  remedy?: string;
  settlementTerms?: string;
  arbitratorName?: string;
  hearingDate?: string;
  decidedAt: string;
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
  status?: GrievanceStatus;
}

export interface EmailDraft {
  templateId: EmailTemplateId;
  locale: "en" | "fr";
  subject: string;
  body: string;
}
