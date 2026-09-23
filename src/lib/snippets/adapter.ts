import type {
  CaSnippet,
  CreateCaSnippetInput,
  UpdateCaSnippetInput,
} from "@/types/qol";

export interface SnippetListFilters {
  unionId: string;
  localId?: string;
  bargainingUnitId?: string;
  query?: string;
}

export interface SnippetBulkCreateResult {
  created: number;
  skipped: number;
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
  /** Create many snippets; skip invalid rows and same-union clauseRef+title duplicates. */
  bulkCreate(
    inputs: CreateCaSnippetInput[],
    meta: {
      unionId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<SnippetBulkCreateResult>;
  /** Delete every snippet for a union (elevated callers only). */
  resetUnion(unionId: string): Promise<number>;
}
