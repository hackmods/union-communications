/** Grievance / bumping attachment metadata + Local Documents vault types. */

import type { TimePunchPhotoKind } from "@/types/time";

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
  /** ORG-008 — receipt photos/PDFs for a travel expense claim. */
  expenseClaimId?: string;
  /** ORG-009 — receipt photos/PDFs for a union business expense submission. */
  expenseSubmissionId?: string;
  /** Time 8f — punch photo for a workforce time entry. */
  timeEntryId?: string;
  punchKind?: TimePunchPhotoKind;
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
  visibility?: "local_shared" | "restricted";
  currentVersion?: number;
  archivedAt?: string;
  retentionUntil?: string;
  legalHold?: boolean;
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
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
  /** Raw in-process bytes for bounded multipart uploads; avoids base64 expansion. */
  contentBytes?: Uint8Array;
  localId?: string;
  bargainingUnitId?: string;
  visibility?: "local_shared" | "restricted";
}
