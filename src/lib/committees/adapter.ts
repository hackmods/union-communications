import type {
  Committee,
  CommitteeListFilters,
  CreateCommitteeInput,
  UpdateCommitteeInput,
} from "@/types/committees";

export interface CommitteesAdapter {
  list(filters: CommitteeListFilters): Promise<Committee[]>;
  getById(id: string): Promise<Committee | null>;
  create(
    input: CreateCommitteeInput,
    meta: { unionId: string; localId: string },
  ): Promise<Committee>;
  update(
    id: string,
    input: UpdateCommitteeInput,
  ): Promise<Committee | null>;
  remove(id: string): Promise<boolean>;
}
