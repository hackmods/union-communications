import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { attachmentMeta } from "@/lib/db/schema";
import { scanAttachment } from "@/lib/attachments/scan";
import {
  buildStorageKey,
  getObjectStorage,
} from "@/lib/attachments/storage";
import type { AttachmentAdapter, AttachmentCreateMeta } from "./adapter";
import type {
  AttachmentMeta,
  CreateAttachmentInput,
} from "@/types/attachments";

function newId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(row: typeof attachmentMeta.$inferSelect): AttachmentMeta {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    grievanceId: row.grievanceId ?? undefined,
    bumpingCaseId: row.bumpingCaseId ?? undefined,
    expenseClaimId: row.expenseClaimId ?? undefined,
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

export class DrizzleAttachmentAdapter implements AttachmentAdapter {
  async listForGrievance(grievanceId: string): Promise<AttachmentMeta[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attachmentMeta)
      .where(eq(attachmentMeta.grievanceId, grievanceId))
      .orderBy(desc(attachmentMeta.createdAt));
    return rows.map(mapRow);
  }

  async listForExpenseClaim(
    expenseClaimId: string,
  ): Promise<AttachmentMeta[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attachmentMeta)
      .where(eq(attachmentMeta.expenseClaimId, expenseClaimId))
      .orderBy(desc(attachmentMeta.createdAt));
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<AttachmentMeta | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attachmentMeta)
      .where(eq(attachmentMeta.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async createForGrievance(
    grievanceId: string,
    input: CreateAttachmentInput,
    meta: AttachmentCreateMeta,
  ): Promise<{ attachment?: AttachmentMeta; error?: string }> {
    const scan = await scanAttachment(input);
    if (!scan.ok) {
      return { error: scan.error ?? "Scan failed" };
    }
    const decoded = decodePayload(input);
    if (!decoded.ok) {
      return { error: decoded.error };
    }

    const attachmentId = newId();
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

    const db = getDb();
    const [row] = await db
      .insert(attachmentMeta)
      .values({
        id: attachmentId,
        unionId: meta.unionId,
        localId: meta.localId,
        bargainingUnitId: meta.bargainingUnitId ?? null,
        grievanceId,
        bumpingCaseId: null,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey,
        scanStatus: scan.status,
        uploadedById: meta.uploadedById,
        createdAt: new Date(),
      })
      .returning();

    return { attachment: mapRow(row) };
  }

  async readBytes(storageKey: string): Promise<Buffer | null> {
    return getObjectStorage().get(storageKey);
  }
}
