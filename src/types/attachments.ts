/** Phase 7 — grievance / bumping attachment metadata (memory until object storage). */

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
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Memory-only placeholder; replace with object-storage key in Phase 7 full */
  storageKey: string;
  scanStatus: AttachmentScanStatus;
  uploadedById: string;
  createdAt: string;
}

export interface CreateAttachmentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Base64 payload for memory adapter only — never log */
  contentBase64?: string;
}
