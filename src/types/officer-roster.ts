/**
 * ORG-002 — Local officer roster (governance record with term dates).
 * Distinct from lightweight Comms letterhead `Officer` in `entities.ts`.
 */

export interface OfficerRosterEntry {
  id: string;
  unionId: string;
  localId: string;
  name: string;
  role: string;
  /** ISO date (YYYY-MM-DD) or datetime when the term began. */
  termStart: string;
  /** ISO date/datetime when the term ends; omit for open-ended. */
  termEnd?: string;
  email?: string;
  phone?: string;
  /** Informal committee labels (Health & Safety, Social, etc.). */
  committees?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfficerRosterInput {
  name: string;
  role: string;
  termStart: string;
  termEnd?: string;
  email?: string;
  phone?: string;
  committees?: string[];
}

export interface UpdateOfficerRosterInput {
  name?: string;
  role?: string;
  termStart?: string;
  termEnd?: string | null;
  email?: string | null;
  phone?: string | null;
  committees?: string[] | null;
}

export interface OfficerRosterListFilters {
  unionId: string;
  localId?: string;
}
