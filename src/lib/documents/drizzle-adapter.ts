import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
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

function newId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(row: typeof documents.$inferSelect): DocumentRecord {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    title: row.title,
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    scanStatus: row.scanStatus,
    uploadedById: row.uploadedById,
    createdAt: toIso(row.createdAt),
  };
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

export class DrizzleDocumentAdapter implements DocumentAdapter {
  async list(filters: DocumentListFilters): Promise<DocumentRecord[]> {
    const db = getDb();
    const conditions = [eq(documents.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(documents.localId, filters.localId));
    }
    if (filters.bargainingUnitId) {
      conditions.push(eq(documents.bargainingUnitId, filters.bargainingUnitId));
    }
    const rows = await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<DocumentRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
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

    const documentId = newId();
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

    const db = getDb();
    const [row] = await db
      .insert(documents)
      .values({
        id: documentId,
        unionId: meta.unionId,
        localId,
        bargainingUnitId:
          input.bargainingUnitId ?? meta.bargainingUnitId ?? null,
        title: input.title,
        category: input.category ?? null,
        description: input.description ?? null,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey,
        scanStatus: scan.status,
        uploadedById: meta.uploadedById,
        createdAt: new Date(),
      })
      .returning();

    return { document: mapRow(row) };
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return false;
    await db.delete(documents).where(eq(documents.id, id));
    await getObjectStorage().delete(existing.storageKey);
    return true;
  }

  async readBytes(storageKey: string): Promise<Buffer | null> {
    return getObjectStorage().get(storageKey);
  }
}
