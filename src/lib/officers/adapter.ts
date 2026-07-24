import type {
  CreateOfficerRosterInput,
  OfficerRosterEntry,
  OfficerRosterListFilters,
  UpdateOfficerRosterInput,
} from "@/types/officer-roster";

export interface OfficerRosterAdapter {
  list(filters: OfficerRosterListFilters): Promise<OfficerRosterEntry[]>;
  getById(id: string): Promise<OfficerRosterEntry | null>;
  create(
    input: CreateOfficerRosterInput,
    meta: { unionId: string; localId: string },
  ): Promise<OfficerRosterEntry>;
  update(
    id: string,
    input: UpdateOfficerRosterInput,
  ): Promise<OfficerRosterEntry | null>;
  remove(id: string): Promise<boolean>;
}
