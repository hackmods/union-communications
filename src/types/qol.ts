/** Phase 5 QOL entity types */

export type CommunicationChannel =
  | "email"
  | "phone"
  | "in_person"
  | "letter"
  | "other";

export type CommunicationDirection = "outbound" | "inbound";

export interface MemberCommunication {
  id: string;
  grievanceId: string;
  unionId: string;
  localId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  summary: string;
  occurredAt: string;
  loggedById: string;
  loggedByName: string;
  createdAt: string;
}

export interface CreateCommunicationInput {
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  summary: string;
  occurredAt: string;
}

export interface CaSnippet {
  id: string;
  unionId: string;
  localId?: string;
  title: string;
  clauseRef: string;
  body: string;
  tags: string[];
  createdById: string;
  createdByName: string;
  updatedAt: string;
  createdAt: string;
}

export interface CreateCaSnippetInput {
  title: string;
  clauseRef: string;
  body: string;
  tags?: string[];
  localId?: string;
}

export interface UpdateCaSnippetInput {
  title?: string;
  clauseRef?: string;
  body?: string;
  tags?: string[];
}

export type MarketplaceTemplateKind =
  | "ca_snippet"
  | "email"
  | "caption"
  | "checklist"
  | "other";

export interface SharedTemplate {
  id: string;
  unionId: string;
  localId: string;
  kind: MarketplaceTemplateKind;
  title: string;
  description: string;
  body: string;
  sharedById: string;
  sharedByName: string;
  createdAt: string;
}

export interface CreateSharedTemplateInput {
  kind: MarketplaceTemplateKind;
  title: string;
  description: string;
  body: string;
}

export interface ScheduledMeeting {
  id: string;
  grievanceId: string;
  unionId: string;
  localId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  description?: string;
  createdById: string;
  createdAt: string;
}

export interface CreateMeetingInput {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  description?: string;
}

export interface HandoffAssignment {
  grievanceId: string;
  fromStewardId: string;
  toStewardId: string;
}

export interface HandoffRequest {
  toStewardId: string;
  toStewardName: string;
  grievanceIds: string[];
  notes?: string;
}

export interface HandoffResult {
  reassigned: number;
  package: HandoffPackage;
}

export interface HandoffPackage {
  version: "1.0";
  exportedAt: string;
  unionId: string;
  localId: string;
  fromOfficerId: string;
  toStewardId: string;
  toStewardName: string;
  notes?: string;
  grievanceIds: string[];
  checklist: string[];
}
