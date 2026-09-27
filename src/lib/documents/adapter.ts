import type {
  CreateDocumentInput,
  DocumentRecord,
  DocumentVersionRecord,
} from "@/types/attachments";

export interface DocumentListFilters {
  unionId: string;
  localId?: string;
  bargainingUnitId?: string;
  userId?: string;
  canReadShared?: boolean;
  includeArchived?: boolean;
}

export interface DocumentCreateMeta {
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  uploadedById: string;
}

export interface DocumentAdapter {
  list(filters: DocumentListFilters): Promise<DocumentRecord[]>;
  getById(id: string, userId?: string, canReadShared?: boolean): Promise<DocumentRecord | null>;
  /** Metadata-only administrative lookup; caller must authorize owner/local leadership and never return file contents. */
  getByIdForManagement(id: string): Promise<DocumentRecord | null>;
  create(
    input: CreateDocumentInput,
    meta: DocumentCreateMeta,
  ): Promise<{ document?: DocumentRecord; error?: string }>;
  archive(id: string, archivedById: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  versions(id: string): Promise<DocumentVersionRecord[]>;
  replaceVersion(id: string, input: CreateDocumentInput, uploadedById: string): Promise<{ document?: DocumentRecord; error?: string }>;
  restoreVersion(id: string, version: number, uploadedById: string): Promise<{ document?: DocumentRecord; error?: string }>;
  updateMetadata(id: string, patch: { title?: string; category?: string | null; description?: string | null; visibility?: "local_shared" | "restricted"; legalHold?: boolean; retentionUntil?: string | null }): Promise<DocumentRecord | null>;
  accessGrants(id: string): Promise<string[]>;
  setAccessGrants(id: string, userIds: string[], grantedById: string): Promise<void>;
  readBytes(storageKey: string): Promise<Buffer | null>;
  readStream(storageKey: string): Promise<ReadableStream<Uint8Array> | null>;
}
