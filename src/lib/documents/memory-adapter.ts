import { scanAttachment } from "@/lib/attachments/scan";
import {
  buildStorageKey,
  getObjectStorage,
} from "@/lib/attachments/storage";
import type {
  DocumentAdapter,
  DocumentCreateMeta,
  DocumentListFilters,
} from "./adapter";
import type {
  CreateDocumentInput,
  DocumentRecord,
} from "@/types/attachments";

const store: DocumentRecord[] = [];

function id(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function decodePayload(
  input: CreateDocumentInput,
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

export class MemoryDocumentAdapter implements DocumentAdapter {
  async list(filters: DocumentListFilters): Promise<DocumentRecord[]> {
    return store
      .filter((d) => {
        if (d.unionId !== filters.unionId) return false;
        if (filters.localId && d.localId !== filters.localId) return false;
        if (
          filters.bargainingUnitId &&
          d.bargainingUnitId &&
          d.bargainingUnitId !== filters.bargainingUnitId
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: string): Promise<DocumentRecord | null> {
    return store.find((d) => d.id === id) ?? null;
  }

  async create(
    input: CreateDocumentInput,
    meta: DocumentCreateMeta,
  ): Promise<{ document?: DocumentRecord; error?: string }> {
    const scan = await scanAttachment(input);
    if (!scan.ok) {
      return { error: scan.error ?? "Scan failed" };
    }
    const decoded = decodePayload(input);
    if (!decoded.ok) {
      return { error: decoded.error };
    }

    const documentId = id();
    const localId = input.localId ?? meta.localId;
    const storageKey = buildStorageKey({
      unionId: meta.unionId,
      localId,
      scope: "document",
      scopeId: documentId,
      attachmentId: documentId,
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

    const row: DocumentRecord = {
      id: documentId,
      unionId: meta.unionId,
      localId,
      bargainingUnitId: input.bargainingUnitId ?? meta.bargainingUnitId,
      title: input.title,
      category: input.category,
      description: input.description,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey,
      scanStatus: scan.status,
      uploadedById: meta.uploadedById,
      createdAt: new Date().toISOString(),
    };
    store.push(row);
    return { document: row };
  }

  async remove(id: string): Promise<boolean> {
    const idx = store.findIndex((d) => d.id === id);
    if (idx < 0) return false;
    const [row] = store.splice(idx, 1);
    if (row) {
      await getObjectStorage().delete(row.storageKey);
    }
    return true;
  }

  async readBytes(storageKey: string): Promise<Buffer | null> {
    return getObjectStorage().get(storageKey);
  }
}

export const memoryDocumentStore = new MemoryDocumentAdapter();
