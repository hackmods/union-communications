import type {
  CreateEventInput,
  CreateGrievanceInput,
  CreateNoteInput,
  Grievance,
  GrievanceEvent,
  GrievanceListFilters,
  GrievanceNote,
  GrievanceWithRelations,
  UpdateGrievanceInput,
} from "@/types/grievance";

export interface GrievanceAdapter {
  list(filters: GrievanceListFilters): Promise<Grievance[]>;
  getById(id: string): Promise<GrievanceWithRelations | null>;
  create(
    input: CreateGrievanceInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
      assignedStewardId: string;
    },
  ): Promise<GrievanceWithRelations>;
  update(id: string, input: UpdateGrievanceInput): Promise<Grievance | null>;
  addNote(
    grievanceId: string,
    input: CreateNoteInput,
    meta: { authorId: string; authorName: string },
  ): Promise<GrievanceNote | null>;
  addEvent(
    grievanceId: string,
    input: CreateEventInput,
  ): Promise<GrievanceEvent | null>;
  importLocalSlice(
    unionId: string,
    localId: string,
    items: GrievanceWithRelations[],
    mode: "merge" | "replace",
  ): Promise<{ imported: number; removed: number }>;
}
