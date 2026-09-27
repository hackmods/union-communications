import { and, desc, eq, isNull, or, exists } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { documents, documentVersions, documentAccessGrants } from "@/lib/db/schema";
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
} from "@/types/attachments";

function newId(): string {
  return `doc-${randomUUID()}`;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function defaultRetentionDate(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 7);
  return date;
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
    visibility: row.visibility,
    currentVersion: row.currentVersion,
    archivedAt: row.archivedAt ? toIso(row.archivedAt) : undefined,
    retentionUntil: row.retentionUntil ? toIso(row.retentionUntil) : undefined,
    legalHold: row.legalHold,
  };
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

export class DrizzleDocumentAdapter implements DocumentAdapter {
  async list(filters: DocumentListFilters): Promise<DocumentRecord[]> {
    const db = getDb();
    const conditions = [eq(documents.unionId, filters.unionId)];
    if (!filters.includeArchived) conditions.push(isNull(documents.archivedAt));
    if (filters.localId) {
      conditions.push(eq(documents.localId, filters.localId));
    }
    if (filters.bargainingUnitId) {
      conditions.push(eq(documents.bargainingUnitId, filters.bargainingUnitId));
    }
    if (filters.userId) {
      const activeGrant = db.select({ id: documentAccessGrants.id }).from(documentAccessGrants).where(and(
        eq(documentAccessGrants.documentId, documents.id),
        eq(documentAccessGrants.userId, filters.userId),
        eq(documentAccessGrants.unionId, filters.unionId),
        isNull(documentAccessGrants.revokedAt),
      ));
      const restrictedAccess = or(eq(documents.uploadedById, filters.userId), exists(activeGrant))!;
      conditions.push(filters.canReadShared ? or(eq(documents.visibility, "local_shared"), restrictedAccess)! : and(eq(documents.visibility, "restricted"), restrictedAccess)!);
    } else {
      conditions.push(eq(documents.visibility, "local_shared"));
    }
    const rows = await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));
    return rows.map(mapRow);
  }

  async getById(id: string, userId?: string, canReadShared = true): Promise<DocumentRecord | null> {
    const db = getDb();
    const conditions = [eq(documents.id, id)];
    if (userId) {
      const activeGrant = db.select({ id: documentAccessGrants.id }).from(documentAccessGrants).where(and(
        eq(documentAccessGrants.documentId, documents.id), eq(documentAccessGrants.userId, userId), isNull(documentAccessGrants.revokedAt),
      ));
      const restrictedAccess = or(eq(documents.uploadedById, userId), exists(activeGrant))!;
      conditions.push(canReadShared ? or(eq(documents.visibility, "local_shared"), restrictedAccess)! : and(eq(documents.visibility, "restricted"), restrictedAccess)!);
    } else conditions.push(eq(documents.visibility, "local_shared"));
    const rows = await db
      .select()
      .from(documents)
      .where(and(...conditions))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async getByIdForManagement(id: string): Promise<DocumentRecord | null> {
    const rows = await getDb().select().from(documents).where(eq(documents.id, id)).limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
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
    try {
      const row = await db.transaction(async (tx) => {
        const [created] = await tx
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
            sizeBytes: decoded.bytes.length,
            storageKey,
            scanStatus: scan.status,
            uploadedById: meta.uploadedById,
            visibility: input.visibility ?? "local_shared",
            currentVersion: 1,
            retentionUntil: defaultRetentionDate(),
            createdAt: new Date(),
          })
          .returning();

        await tx.insert(documentVersions).values({
          id: `${documentId}-v1`,
          documentId,
          unionId: meta.unionId,
          localId,
          version: 1,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: decoded.bytes.length,
          storageKey,
          sha256: createHash("sha256").update(decoded.bytes).digest("hex"),
          scanStatus: scan.status,
          uploadedById: meta.uploadedById,
          createdAt: new Date(),
        });
        return created;
      });

      return { document: mapRow(row) };
    } catch (err) {
      await getObjectStorage().delete(storageKey);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to publish document metadata",
      };
    }
  }

  async archive(id: string, archivedById: string): Promise<boolean> {
    const db = getDb();
    const [existing] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!existing || existing.archivedAt) return false;
    await db.update(documents).set({ archivedAt: new Date(), archivedById }).where(eq(documents.id, id));
    return true;
  }

  async restore(id: string): Promise<boolean> {
    const db = getDb();
    const [existing] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!existing?.archivedAt) return false;
    await db.update(documents).set({ archivedAt: null, archivedById: null }).where(eq(documents.id, id));
    return true;
  }

  async versions(id: string) {
    const db = getDb();
    const rows = await db.select().from(documentVersions).where(eq(documentVersions.documentId, id)).orderBy(desc(documentVersions.version));
    return rows.map((row) => ({ id: row.id, documentId: row.documentId, version: row.version, fileName: row.fileName, mimeType: row.mimeType, sizeBytes: row.sizeBytes, sha256: row.sha256 ?? undefined, scanStatus: row.scanStatus, uploadedById: row.uploadedById, createdAt: toIso(row.createdAt) }));
  }

  async replaceVersion(id: string, input: CreateDocumentInput, uploadedById: string) {
    const decoded = decodePayload(input);
    if (!decoded.ok) return { error: decoded.error };
    const signatureError = validateAttachmentBytes(input.mimeType, decoded.bytes);
    if (signatureError) return { error: signatureError };
    const scan = await scanAttachment({ ...input, contentBase64: undefined, contentBytes: decoded.bytes });
    if (!scan.ok) return { error: scan.error ?? "Scan failed" };
    const db = getDb();
    const [existing] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!existing || existing.archivedAt) return { error: "Document not found" };
    const version = existing.currentVersion + 1;
    const versionId = `${id}-v${version}`;
    const storageKey = buildStorageKey({ unionId: existing.unionId, localId: existing.localId, scope: "document", scopeId: id, attachmentId: versionId, fileName: input.fileName });
    try {
      await getObjectStorage().put(storageKey, decoded.bytes, input.mimeType);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to write object storage" };
    }
    try {
      await db.transaction(async (tx) => {
        await tx.update(documents).set({ title: input.title, category: input.category ?? null, description: input.description ?? null, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: decoded.bytes.length, storageKey, scanStatus: scan.status, uploadedById, currentVersion: version }).where(eq(documents.id, id));
        await tx.insert(documentVersions).values({ id: versionId, documentId: id, unionId: existing.unionId, localId: existing.localId, version, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: decoded.bytes.length, storageKey, sha256: createHash("sha256").update(decoded.bytes).digest("hex"), scanStatus: scan.status, uploadedById, createdAt: new Date() });
      });
    } catch (err) {
      await getObjectStorage().delete(storageKey);
      return { error: err instanceof Error ? err.message : "Failed to publish document version" };
    }
    const [updated] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return updated ? { document: mapRow(updated) } : { error: "Document version was not published" };
  }

  async restoreVersion(id: string, version: number, uploadedById: string) {
    const db = getDb();
    const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    const [prior] = await db.select().from(documentVersions).where(and(eq(documentVersions.documentId, id), eq(documentVersions.version, version))).limit(1);
    if (!doc || doc.archivedAt || !prior || prior.scanStatus !== "clean") return { error: "Clean historical version not found" };
    const bytes = await getObjectStorage().get(prior.storageKey);
    if (!bytes) return { error: "Historical file is unavailable" };
    return this.replaceVersion(id, { title: doc.title, category: doc.category ?? undefined, description: doc.description ?? undefined, fileName: prior.fileName, mimeType: prior.mimeType, sizeBytes: bytes.length, contentBytes: bytes }, uploadedById);
  }

  async updateMetadata(id: string, patch: { title?: string; category?: string | null; description?: string | null; visibility?: "local_shared" | "restricted"; legalHold?: boolean; retentionUntil?: string | null }): Promise<DocumentRecord | null> {
    const db = getDb();
    const [updated] = await db.update(documents).set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
      ...(patch.legalHold !== undefined ? { legalHold: patch.legalHold } : {}),
      ...(patch.retentionUntil !== undefined ? { retentionUntil: patch.retentionUntil ? new Date(patch.retentionUntil) : null } : {}),
    }).where(eq(documents.id, id)).returning();
    return updated ? mapRow(updated) : null;
  }

  async readBytes(storageKey: string): Promise<Buffer | null> {
    return getObjectStorage().get(storageKey);
  }

  async readStream(storageKey: string): Promise<ReadableStream<Uint8Array> | null> {
    return getObjectStorage().getStream(storageKey);
  }

  async accessGrants(id: string): Promise<string[]> {
    const db = getDb();
    const rows = await db.select({ userId: documentAccessGrants.userId }).from(documentAccessGrants)
      .where(and(eq(documentAccessGrants.documentId, id), isNull(documentAccessGrants.revokedAt)));
    return rows.map((row) => row.userId).sort();
  }

  async setAccessGrants(id: string, userIds: string[], grantedById: string): Promise<void> {
    const db = getDb();
    const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!doc) throw new Error("Document not found");
    const desired = [...new Set(userIds)];
    const existing = await db.select().from(documentAccessGrants).where(eq(documentAccessGrants.documentId, id));
    await db.transaction(async (tx) => {
      for (const grant of existing) {
        if (!desired.includes(grant.userId) && !grant.revokedAt) {
          await tx.update(documentAccessGrants).set({ revokedAt: new Date() }).where(eq(documentAccessGrants.id, grant.id));
        } else if (desired.includes(grant.userId) && grant.revokedAt) {
          await tx.update(documentAccessGrants).set({ revokedAt: null, grantedById }).where(eq(documentAccessGrants.id, grant.id));
        }
      }
      const existingIds = new Set(existing.map((grant) => grant.userId));
      for (const userId of desired) {
        if (existingIds.has(userId)) continue;
        await tx.insert(documentAccessGrants).values({
          id: `dgrant-${randomUUID()}`, documentId: id, unionId: doc.unionId, localId: doc.localId,
          userId, grantedById, createdAt: new Date(),
        });
      }
    });
  }
}
