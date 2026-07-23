import {
  isDownloadAllowed,
  scanAttachmentStub,
} from "@/lib/attachments/scan";
import {
  buildStorageKey,
  getObjectStorage,
} from "@/lib/attachments/storage";
import type { AttachmentAdapter, AttachmentCreateMeta } from "./adapter";
import type {
  AttachmentMeta,
  CreateAttachmentInput,
} from "@/types/attachments";

const store: AttachmentMeta[] = [];

function id(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function decodePayload(
  input: CreateAttachmentInput,
): { ok: true; bytes: Buffer } | { ok: false; error: string } {
  if (!input.contentBase64?.trim()) {
    return { ok: false, error: "contentBase64 is required for durable storage" };
  }
  try {
    const bytes = Buffer.from(input.contentBase64, "base64");
    if (bytes.length === 0) {
      return { ok: false, error: "Empty file payload" };
    }
    if (bytes.length !== input.sizeBytes) {
      return {
        ok: false,
        error: "sizeBytes does not match decoded content length",
      };
    }
    return { ok: true, bytes };
  } catch {
    return { ok: false, error: "Invalid base64 content" };
  }
}

export class MemoryAttachmentAdapter implements AttachmentAdapter {
  async listForGrievance(grievanceId: string): Promise<AttachmentMeta[]> {
    return store
      .filter((a) => a.grievanceId === grievanceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: string): Promise<AttachmentMeta | null> {
    return store.find((a) => a.id === id) ?? null;
  }

  async createForGrievance(
    grievanceId: string,
    input: CreateAttachmentInput,
    meta: AttachmentCreateMeta,
  ): Promise<{ attachment?: AttachmentMeta; error?: string }> {
    const scan = scanAttachmentStub(input);
    if (!scan.ok) {
      return { error: scan.error ?? "Scan failed" };
    }
    const decoded = decodePayload(input);
    if (!decoded.ok) {
      return { error: decoded.error };
    }

    const attachmentId = id();
    const storageKey = buildStorageKey({
      unionId: meta.unionId,
      localId: meta.localId,
      scope: "grievance",
      scopeId: grievanceId,
      attachmentId,
      fileName: input.fileName,
    });

    try {
      await getObjectStorage().put(storageKey, decoded.bytes, input.mimeType);
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : "Failed to write object storage",
      };
    }

    const row: AttachmentMeta = {
      id: attachmentId,
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: meta.bargainingUnitId,
      grievanceId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey,
      scanStatus: scan.status,
      uploadedById: meta.uploadedById,
      createdAt: new Date().toISOString(),
    };
    store.push(row);
    return { attachment: row };
  }

  async readBytes(storageKey: string): Promise<Buffer | null> {
    return getObjectStorage().get(storageKey);
  }
}

export function assertAttachmentDownloadable(
  attachment: AttachmentMeta,
): boolean {
  return isDownloadAllowed(attachment.scanStatus);
}

/** @deprecated use attachmentStore from ./store — kept for transitional imports */
export const memoryAttachmentStore = new MemoryAttachmentAdapter();
