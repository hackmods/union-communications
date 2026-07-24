/**
 * ORG-003 — Nominations + printable ballot (no online secret-ballot voting).
 * Tallies are recorded manually after paper/email ballots are counted offline.
 */

export type NominationStatus = "pending" | "accepted" | "declined";

export type ElectionCycleStatus = "open" | "closed" | "tallied";

export interface Nomination {
  id: string;
  position: string;
  nomineeName: string;
  status: NominationStatus;
  nominator?: string;
}

export interface ElectionTally {
  position: string;
  nomineeName: string;
  votes: number;
}

export interface ElectionCycle {
  id: string;
  unionId: string;
  localId: string;
  title: string;
  /** Positions contested in this cycle (e.g. President, Steward). */
  positions: string[];
  status: ElectionCycleStatus;
  nominations: Nomination[];
  /** Manual tallies entered after offline counting. */
  tallies: ElectionTally[];
  /** Suggested term start when promoting winners to the officer roster. */
  termStart?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateElectionCycleInput {
  title: string;
  positions: string[];
  termStart?: string;
}

export interface UpdateElectionCycleInput {
  title?: string;
  positions?: string[];
  status?: ElectionCycleStatus;
  termStart?: string | null;
}

export interface CreateNominationInput {
  position: string;
  nomineeName: string;
  nominator?: string;
  status?: NominationStatus;
}

export interface UpdateNominationInput {
  position?: string;
  nomineeName?: string;
  status?: NominationStatus;
  nominator?: string | null;
}

export interface RecordTalliesInput {
  tallies: ElectionTally[];
  /** When true, sets cycle status to `tallied`. Default true. */
  markTallied?: boolean;
}

export interface PromoteToRosterInput {
  position: string;
  nomineeName: string;
  role?: string;
  termStart?: string;
  termEnd?: string;
}

export interface ElectionListFilters {
  unionId: string;
  localId?: string;
  status?: ElectionCycleStatus;
}
