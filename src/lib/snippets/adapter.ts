import type {
  CaSnippet,
  CreateCaSnippetInput,
  UpdateCaSnippetInput,
} from "@/types/qol";

export interface SnippetListFilters {
  unionId: string;
  localId?: string;
  query?: string;
}

export interface SnippetAdapter {
  list(filters: SnippetListFilters): Promise<CaSnippet[]>;
  getById(id: string): Promise<CaSnippet | null>;
  create(
    input: CreateCaSnippetInput,
    meta: {
      unionId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<CaSnippet>;
  update(id: string, input: UpdateCaSnippetInput): Promise<CaSnippet | null>;
  remove(id: string): Promise<boolean>;
}
