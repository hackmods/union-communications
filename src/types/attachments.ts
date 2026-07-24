/** Grievance / bumping attachment metadata + Local Documents vault types. */

export type AttachmentScanStatus =
  | "pending"
  | "clean"
  | "infected"
  | "skipped_dev";

export interface AttachmentMeta {
  id: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  grievanceId?: string;
  bumpingCaseId?: string;
  /** ORG-008 — receipt photos/PDFs for an expense claim. */
  expenseClaimId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Object-storage key (local path segment or future S3 key) — never a memory:// stub */
  storageKey: string;
  scanStatus: AttachmentScanStatus;
  uploadedById: string;
  createdAt: string;
}

export interface CreateAttachmentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Base64 payload — required for durable storage; never log */
  contentBase64?: string;
}

/** Local Documents vault — CBAs, minutes, scanned evidence not tied to a case. */
export interface DocumentRecord {
  id: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  title: string;
  category?: string;
  description?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  scanStatus: AttachmentScanStatus;
  uploadedById: string;
  createdAt: string;
}

export interface CreateDocumentInput {
  title: string;
  category?: string;
  description?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string;
  localId?: string;
  bargainingUnitId?: string;
}
