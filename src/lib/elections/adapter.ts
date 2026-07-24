import type {
  CreateElectionCycleInput,
  CreateNominationInput,
  ElectionCycle,
  ElectionListFilters,
  PromoteToRosterInput,
  RecordTalliesInput,
  UpdateElectionCycleInput,
  UpdateNominationInput,
} from "@/types/elections";
import type { OfficerRosterEntry } from "@/types/officer-roster";

export interface ElectionsAdapter {
  list(filters: ElectionListFilters): Promise<ElectionCycle[]>;
  getById(id: string): Promise<ElectionCycle | null>;
  create(
    input: CreateElectionCycleInput,
    meta: { unionId: string; localId: string },
  ): Promise<ElectionCycle>;
  update(
    id: string,
    input: UpdateElectionCycleInput,
  ): Promise<ElectionCycle | null>;
  remove(id: string): Promise<boolean>;
  addNomination(
    cycleId: string,
    input: CreateNominationInput,
  ): Promise<ElectionCycle | null>;
  updateNomination(
    cycleId: string,
    nominationId: string,
    input: UpdateNominationInput,
  ): Promise<ElectionCycle | null>;
  removeNomination(
    cycleId: string,
    nominationId: string,
  ): Promise<ElectionCycle | null>;
  recordTallies(
    cycleId: string,
    input: RecordTalliesInput,
  ): Promise<ElectionCycle | null>;
  /**
   * Creates an OfficerRosterEntry via the officers store (ORG-002).
   * Does not cast online votes — tallies must already be recorded offline.
   */
  promoteToRoster(
    cycleId: string,
    input: PromoteToRosterInput,
    createOfficer: (
      input: {
        name: string;
        role: string;
        termStart: string;
        termEnd?: string;
      },
      meta: { unionId: string; localId: string },
    ) => Promise<OfficerRosterEntry>,
  ): Promise<{ cycle: ElectionCycle; officer: OfficerRosterEntry } | null>;
}
