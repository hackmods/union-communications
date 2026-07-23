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
  getById(id: string): Promise<AttachmentMeta | null>;
  createForGrievance(
    grievanceId: string,
    input: CreateAttachmentInput,
    meta: AttachmentCreateMeta,
  ): Promise<{ attachment?: AttachmentMeta; error?: string }>;
  /** Read stored bytes for a known storageKey (after auth + scan checks). */
  readBytes(storageKey: string): Promise<Buffer | null>;
}
