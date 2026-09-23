import { createHash } from "node:crypto";
import type { CustomizationAdapter, CustomizationTransaction } from "@/lib/customization/adapter";
import { writeCustomizationAudit } from "@/lib/customization/audit";
import { layerSchema, parseBounded, resourceKeySchema, SCHEMA_VERSION } from "@/lib/customization/schemas";
import type { CustomizationLayer } from "@/lib/customization/types";
import type { RlsSessionContext } from "@/lib/db/rls-context";

export type DraftSaveInput = {
  resourceId: string;
  scopeId: string;
  unionId: string | null;
  actorId: string;
  expectedLockVersion: number;
  payload: unknown;
  baseReleaseId?: string | null;
  ancestorHeads?: Record<string, string>;
  reviews?: Record<string, { hash: string; reviewedBy: string; reviewedAt: string }>;
  reason: string;
};

export type DraftRecord = {
  resourceId: string;
  scopeId: string;
  unionId: string | null;
  payload: CustomizationLayer;
  baseReleaseId: string | null;
  ancestorHeads: Record<string, string>;
  reviews: Record<string, { hash: string; reviewedBy: string; reviewedAt: string }>;
  schemaVersion: number;
  lockVersion: number;
  updatedBy: string;
};

function asLayer(payload: unknown): CustomizationLayer {
  return parseBounded(layerSchema, payload);
}

export async function getDraft(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  resourceId: string,
): Promise<DraftRecord | null> {
  return adapter.transaction(context, async (tx) => {
    const [row] = await tx.read("drafts", { resourceId });
    if (!row) return null;
    return {
      resourceId: row.resourceId,
      scopeId: row.scopeId,
      unionId: row.unionId,
      payload: asLayer(row.payload),
      baseReleaseId: row.baseReleaseId,
      ancestorHeads: row.ancestorHeads,
      reviews: row.reviews,
      schemaVersion: row.schemaVersion,
      lockVersion: row.lockVersion,
      updatedBy: row.updatedBy,
    };
  });
}

/** Optimistic draft save. Mismatched lockVersion returns conflict without writing. */
export async function saveDraft(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: DraftSaveInput,
): Promise<{ ok: true; lockVersion: number } | { ok: false; status: 409; error: "draft_conflict" }> {
  const payload = asLayer(input.payload);
  if (payload.key) resourceKeySchema.parse(payload.key);
  return adapter.transaction(context, async (tx) => {
    const [existing] = await tx.read("drafts", { resourceId: input.resourceId }, true);
    if (!existing) {
      await tx.insert("drafts", {
        resourceId: input.resourceId,
        scopeId: input.scopeId,
        unionId: input.unionId,
        payload,
        baseReleaseId: input.baseReleaseId ?? null,
        ancestorHeads: input.ancestorHeads ?? {},
        reviews: input.reviews ?? {},
        schemaVersion: SCHEMA_VERSION,
        lockVersion: 1,
        updatedBy: input.actorId,
      });
      await writeCustomizationAudit(tx, {
        scopeId: input.scopeId,
        unionId: input.unionId,
        actorId: input.actorId,
        action: "draft.save",
        resourceId: input.resourceId,
        reason: input.reason,
        metadata: { lockVersion: 1 },
      });
      return { ok: true as const, lockVersion: 1 };
    }
    if (existing.lockVersion !== input.expectedLockVersion) {
      return { ok: false as const, status: 409 as const, error: "draft_conflict" as const };
    }
    const nextVersion = existing.lockVersion + 1;
    const updated = await tx.update(
      "drafts",
      { resourceId: input.resourceId, lockVersion: input.expectedLockVersion },
      {
        payload,
        baseReleaseId: input.baseReleaseId ?? existing.baseReleaseId,
        ancestorHeads: input.ancestorHeads ?? existing.ancestorHeads,
        reviews: input.reviews ?? existing.reviews,
        schemaVersion: SCHEMA_VERSION,
        lockVersion: nextVersion,
        updatedBy: input.actorId,
        updatedAt: new Date(),
      },
    );
    if (!updated.length) return { ok: false as const, status: 409 as const, error: "draft_conflict" as const };
    await writeCustomizationAudit(tx, {
      scopeId: input.scopeId,
      unionId: input.unionId,
      actorId: input.actorId,
      action: "draft.save",
      resourceId: input.resourceId,
      reason: input.reason,
      metadata: { lockVersion: nextVersion },
    });
    return { ok: true as const, lockVersion: nextVersion };
  });
}

export function draftContentHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function readDraftInTransaction(
  tx: CustomizationTransaction,
  resourceId: string,
): Promise<DraftRecord | null> {
  const [row] = await tx.read("drafts", { resourceId }, true);
  if (!row) return null;
  return {
    resourceId: row.resourceId,
    scopeId: row.scopeId,
    unionId: row.unionId,
    payload: asLayer(row.payload),
    baseReleaseId: row.baseReleaseId,
    ancestorHeads: row.ancestorHeads,
    reviews: row.reviews,
    schemaVersion: row.schemaVersion,
    lockVersion: row.lockVersion,
    updatedBy: row.updatedBy,
  };
}
