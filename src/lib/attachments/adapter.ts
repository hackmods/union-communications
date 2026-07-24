import type {
  AttachmentMeta,
  CreateAttachmentInput,
} from "@/types/attachments";

export interface AttachmentCreateMeta {
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  uploadedById: string;
}

export interface AttachmentAdapter {
  listForGrievance(grievanceId: string): Promise<AttachmentMeta[]>;
  /** Phase 7 light — position descriptions / committee PDFs linked to a bumping case. */
  listForBumping(bumpingCaseId: string): Promise<AttachmentMeta[]>;
  /** ORG-008 — receipt photos/PDFs linked to an expense claim. */
  listForExpenseClaim(expenseClaimId: string): Promise<AttachmentMeta[]>;
  getById(id: string): Promise<AttachmentMeta | null>;
  createForGrievance(
    grievanceId: string,
    input: CreateAttachmentInput,
    meta: AttachmentCreateMeta,
  ): Promise<{ attachment?: AttachmentMeta; error?: string }>;
  createForBumping(
    bumpingCaseId: string,
    input: CreateAttachmentInput,
    meta: AttachmentCreateMeta,
  ): Promise<{ attachment?: AttachmentMeta; error?: string }>;
  /** Read stored bytes for a known storageKey (after auth + scan checks). */
  readBytes(storageKey: string): Promise<Buffer | null>;
}
