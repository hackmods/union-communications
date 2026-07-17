import { scanAttachmentStub } from "@/lib/attachments/scan";
import type {
  AttachmentMeta,
  CreateAttachmentInput,
} from "@/types/attachments";

const store: AttachmentMeta[] = [];

function id(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MemoryAttachmentAdapter {
  async listForGrievance(grievanceId: string): Promise<AttachmentMeta[]> {
    return store
      .filter((a) => a.grievanceId === grievanceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createForGrievance(
    grievanceId: string,
    input: CreateAttachmentInput,
    meta: {
      unionId: string;
      localId: string;
      bargainingUnitId?: string;
      uploadedById: string;
    },
  ): Promise<{ attachment?: AttachmentMeta; error?: string }> {
    const scan = scanAttachmentStub(input);
    if (!scan.ok) {
      return { error: scan.error ?? "Scan failed" };
    }
    const row: AttachmentMeta = {
      id: id(),
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: meta.bargainingUnitId,
      grievanceId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: `memory://${grievanceId}/${input.fileName}`,
      scanStatus: scan.status,
      uploadedById: meta.uploadedById,
      createdAt: new Date().toISOString(),
    };
    store.push(row);
    return { attachment: row };
  }
}

export const attachmentStore = new MemoryAttachmentAdapter();
