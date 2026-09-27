import { createHash, randomUUID } from "node:crypto";
import { scanAttachment } from "@/lib/attachments/scan";
import { validateAttachmentBytes } from "@/lib/attachments/file-validation";
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
  DocumentVersionRecord,
} from "@/types/attachments";

const store: DocumentRecord[] = [];
const history = new Map<string, DocumentVersionRecord[]>();
const versionKeys = new Map<string, Map<number, string>>();
const grants = new Map<string, Set<string>>();

function id(): string {
  return `doc-${randomUUID()}`;
}

function decodePayload(
  input: CreateDocumentInput,
): { ok: true; bytes: Buffer } | { ok: false; error: string } {
  if (input.contentBytes) {
    const bytes = Buffer.from(input.contentBytes);
    if (bytes.length === 0) return { ok: false, error: "Empty file payload" };
    if (bytes.length !== input.sizeBytes) return { ok: false, error: "sizeBytes does not match content length" };
    return { ok: true, bytes };
  }
  if (!input.contentBase64?.trim()) return { ok: false, error: "File content is required" };
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
        if (d.visibility === "restricted" && d.uploadedById !== filters.userId && !grants.get(d.id)?.has(filters.userId ?? "")) return false;
        if ((d.visibility ?? "local_shared") === "local_shared" && !filters.canReadShared) return false;
        if (d.archivedAt && !filters.includeArchived) return false;
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

  async getById(id: string, userId?: string, canReadShared = true): Promise<DocumentRecord | null> {
    const row = store.find((d) => d.id === id);
    if (row?.visibility === "restricted" && row.uploadedById !== userId && !grants.get(id)?.has(userId ?? "")) return null;
    if (row && (row.visibility ?? "local_shared") === "local_shared" && !canReadShared) return null;
    return row ?? null;
  }

  async getByIdForManagement(id: string): Promise<DocumentRecord | null> {
    return store.find((d) => d.id === id) ?? null;
  }

  async create(
    input: CreateDocumentInput,
    meta: DocumentCreateMeta,
  ): Promise<{ document?: DocumentRecord; error?: string }> {
    const decoded = decodePayload(input);
    if (!decoded.ok) {
      return { error: decoded.error };
    }
    const signatureError = validateAttachmentBytes(input.mimeType, decoded.bytes);
    if (signatureError) return { error: signatureError };
    const scan = await scanAttachment({ ...input, contentBase64: undefined, contentBytes: decoded.bytes });
    if (!scan.ok) return { error: scan.error ?? "Scan failed" };

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
      visibility: input.visibility ?? "local_shared",
      createdAt: new Date().toISOString(),
      retentionUntil: (() => { const date = new Date(); date.setFullYear(date.getFullYear() + 7); return date.toISOString(); })(),
      legalHold: false,
    };
    store.push(row);
    history.set(documentId, [{ id: `${documentId}-v1`, documentId, version: 1, fileName: row.fileName, mimeType: row.mimeType, sizeBytes: row.sizeBytes, sha256: createHash("sha256").update(decoded.bytes).digest("hex"), scanStatus: scan.status, uploadedById: meta.uploadedById, createdAt: row.createdAt }]);
    versionKeys.set(documentId, new Map([[1, storageKey]]));
    return { document: row };
  }

  async archive(id: string, _archivedById: string): Promise<boolean> {
    const row = store.find((d) => d.id === id);
    if (!row || row.archivedAt) return false;
    row.archivedAt = new Date().toISOString();
    return true;
  }

  async restore(id: string): Promise<boolean> {
    const row = store.find((d) => d.id === id);
    if (!row?.archivedAt) return false;
    delete row.archivedAt;
    return true;
  }

  async versions(id: string): Promise<DocumentVersionRecord[]> {
    return [...(history.get(id) ?? [])].sort((a, b) => b.version - a.version);
  }

  async replaceVersion(id: string, input: CreateDocumentInput, uploadedById: string) {
    const doc = store.find((row) => row.id === id);
    if (!doc || doc.archivedAt) return { error: "Document not found" };
    const decoded = decodePayload(input);
    if (!decoded.ok) return { error: decoded.error };
    const signatureError = validateAttachmentBytes(input.mimeType, decoded.bytes);
    if (signatureError) return { error: signatureError };
    const scan = await scanAttachment({ ...input, contentBase64: undefined, contentBytes: decoded.bytes });
    if (!scan.ok) return { error: scan.error ?? "Scan failed" };
    const version = (doc.currentVersion ?? 1) + 1;
    const storageKey = buildStorageKey({ unionId: doc.unionId, localId: doc.localId, scope: "document", scopeId: id, attachmentId: `${id}-v${version}`, fileName: input.fileName });
    await getObjectStorage().put(storageKey, decoded.bytes, input.mimeType);
    doc.title = input.title;
    doc.category = input.category;
    doc.description = input.description;
    doc.fileName = input.fileName;
    doc.mimeType = input.mimeType;
    doc.sizeBytes = decoded.bytes.length;
    doc.storageKey = storageKey;
    doc.scanStatus = scan.status;
    doc.uploadedById = uploadedById;
    doc.currentVersion = version;
    const record: DocumentVersionRecord = { id: `${id}-v${version}`, documentId: id, version, fileName: doc.fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, sha256: createHash("sha256").update(decoded.bytes).digest("hex"), scanStatus: scan.status, uploadedById, createdAt: new Date().toISOString() };
    history.set(id, [...(history.get(id) ?? []), record]);
    const keys = versionKeys.get(id) ?? new Map<number, string>();
    keys.set(version, storageKey);
    versionKeys.set(id, keys);
    return { document: doc };
  }

  async restoreVersion(id: string, version: number, uploadedById: string) {
    const doc = store.find((row) => row.id === id);
    const old = history.get(id)?.find((row) => row.version === version);
    if (!doc || doc.archivedAt || !old || old.scanStatus !== "clean") return { error: "Clean historical version not found" };
    const bytes = await getObjectStorage().get(versionKeys.get(id)?.get(version) ?? "");
    if (!bytes) return { error: "Historical file is unavailable" };
    return this.replaceVersion(id, { title: doc.title, category: doc.category, description: doc.description, fileName: old.fileName, mimeType: old.mimeType, sizeBytes: bytes.length, contentBytes: bytes }, uploadedById);
  }

  async updateMetadata(id: string, patch: { title?: string; category?: string | null; description?: string | null; visibility?: "local_shared" | "restricted"; legalHold?: boolean; retentionUntil?: string | null }): Promise<DocumentRecord | null> {
    const row = store.find((d) => d.id === id);
    if (!row || row.archivedAt) return null;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.category !== undefined) row.category = patch.category ?? undefined;
    if (patch.description !== undefined) row.description = patch.description ?? undefined;
    if (patch.visibility !== undefined) row.visibility = patch.visibility;
    if (patch.legalHold !== undefined) row.legalHold = patch.legalHold;
    if (patch.retentionUntil !== undefined) row.retentionUntil = patch.retentionUntil ?? undefined;
    return row;
  }

  async accessGrants(id: string): Promise<string[]> {
    return [...(grants.get(id) ?? new Set<string>())].sort();
  }

  async setAccessGrants(id: string, userIds: string[], _grantedById: string): Promise<void> {
    grants.set(id, new Set(userIds));
  }

  async readBytes(storageKey: string): Promise<Buffer | null> {
    return getObjectStorage().get(storageKey);
  }

  async readStream(storageKey: string): Promise<ReadableStream<Uint8Array> | null> {
    return getObjectStorage().getStream(storageKey);
  }
}

export const memoryDocumentStore = new MemoryDocumentAdapter();

/** @internal test helper */
export function resetDocumentsMemoryForTests(): void {
  store.splice(0, store.length);
  history.clear();
  versionKeys.clear();
  grants.clear();
}

/** @internal test helper — insert a vault row without scanning or writing bytes. */
export function insertDocumentForTests(document: DocumentRecord): void {
  store.push(document);
}
