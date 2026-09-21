/** ORG-004 — Internal (non-bargaining) committee roster. */

export interface Committee {
  id: string;
  unionId: string;
  localId: string;
  name: string;
  description?: string;
  /** References `OfficerRosterEntry.id` from ORG-002. */
  memberOfficerIds: string[];
  /** Active account IDs linked through `committee_memberships`. */
  memberUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommitteeInput {
  name: string;
  description?: string;
  memberOfficerIds?: string[];
  memberUserIds?: string[];
}

export interface UpdateCommitteeInput {
  name?: string;
  description?: string | null;
  memberOfficerIds?: string[];
  memberUserIds?: string[];
}

export interface CommitteeListFilters {
  unionId: string;
  localId?: string;
}
