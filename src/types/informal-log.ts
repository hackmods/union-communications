/** FUTURE-001 — Steward Quick-Log (pre-filing informal discussion) */

import type { CommunicationChannel } from "@/types/qol";

export interface InformalLogEntry {
  id: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  memberPseudonym?: string;
  topic: string;
  channel: CommunicationChannel;
  summary: string;
  occurredAt: string;
  loggedById: string;
  loggedByName: string;
  convertedToGrievanceId?: string;
  createdAt: string;
}

export interface CreateInformalLogInput {
  memberPseudonym?: string;
  topic: string;
  channel: CommunicationChannel;
  summary: string;
  occurredAt: string;
  bargainingUnitId?: string;
}

export interface UpdateInformalLogInput {
  memberPseudonym?: string | null;
  topic?: string;
  channel?: CommunicationChannel;
  summary?: string;
  occurredAt?: string;
  bargainingUnitId?: string | null;
  convertedToGrievanceId?: string | null;
}

export interface InformalLogListFilters {
  unionId: string;
  localId?: string;
  bargainingUnitId?: string;
  /** When true, only entries not yet converted to a grievance. */
  unconvertedOnly?: boolean;
}
