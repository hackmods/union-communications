import type {
  CreateDocumentInput,
  DocumentRecord,
} from "@/types/attachments";

export interface DocumentListFilters {
  unionId: string;
  localId?: string;
  bargainingUnitId?: string;
}

export interface DocumentCreateMeta {
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  uploadedById: string;
}

export interface DocumentAdapter {
  list(filters: DocumentListFilters): Promise<DocumentRecord[]>;
  getById(id: string): Promise<DocumentRecord | null>;
  create(
    input: CreateDocumentInput,
    meta: DocumentCreateMeta,
  ): Promise<{ document?: DocumentRecord; error?: string }>;
  remove(id: string): Promise<boolean>;
  readBytes(storageKey: string): Promise<Buffer | null>;
}
