import type {
  CreateInformalLogInput,
  InformalLogEntry,
  InformalLogListFilters,
  UpdateInformalLogInput,
} from "@/types/informal-log";

export interface InformalLogAdapter {
  list(filters: InformalLogListFilters): Promise<InformalLogEntry[]>;
  getById(id: string): Promise<InformalLogEntry | null>;
  create(
    input: CreateInformalLogInput,
    meta: {
      unionId: string;
      localId: string;
      bargainingUnitId?: string;
      loggedById: string;
      loggedByName: string;
    },
  ): Promise<InformalLogEntry>;
  update(
    id: string,
    input: UpdateInformalLogInput,
  ): Promise<InformalLogEntry | null>;
  remove(id: string): Promise<boolean>;
}
