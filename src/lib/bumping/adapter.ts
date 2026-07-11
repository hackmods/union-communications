import type {
  BumpingCaseWithRelations,
  BumpingListFilters,
  CreateBumpingCaseInput,
  CreateDecisionInput,
  CreateNoteInput,
  CreateSessionInput,
  UpdateBumpingCaseInput,
  BumpingCase,
  CommitteeSession,
  CommitteeNote,
  DecisionRecord,
} from "@/types/bumping";

export interface BumpingAdapter {
  list(filters: BumpingListFilters): Promise<BumpingCase[]>;
  getById(id: string): Promise<BumpingCaseWithRelations | null>;
  create(
    input: CreateBumpingCaseInput,
    meta: { unionId: string; localId: string; createdById: string },
  ): Promise<BumpingCaseWithRelations>;
  update(id: string, input: UpdateBumpingCaseInput): Promise<BumpingCase | null>;
  addSession(
    caseId: string,
    input: CreateSessionInput,
    meta: { createdById: string },
  ): Promise<CommitteeSession | null>;
  addNote(
    caseId: string,
    input: CreateNoteInput,
    meta: { authorId: string; authorName: string },
  ): Promise<CommitteeNote | null>;
  recordDecision(
    caseId: string,
    input: CreateDecisionInput,
    meta: { recordedById: string },
  ): Promise<DecisionRecord | null>;
  importLocalSlice(
    unionId: string,
    localId: string,
    items: BumpingCaseWithRelations[],
    mode: "merge" | "replace",
  ): Promise<{ imported: number; removed: number }>;
}
