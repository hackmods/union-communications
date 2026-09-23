import { createHash } from "node:crypto";
import type { CustomizationAdapter, CustomizationTransaction } from "@/lib/customization/adapter";
import { writeCustomizationAudit } from "@/lib/customization/audit";
import { compilePublication } from "@/lib/customization/compile";
import { assertReleaseImpactBudget } from "@/lib/customization/dependencies";
import { COMPILED_DEFAULTS } from "@/lib/customization/defaults";
import { draftContentHash, readDraftInTransaction } from "@/lib/customization/drafts";
import { previewLayerImpact } from "@/lib/customization/preview";
import { layerSchema, parseBounded, resourceKeySchema, SCHEMA_VERSION } from "@/lib/customization/schemas";
import { resolveScopeChain } from "@/lib/customization/scope";
import type { Audience, CustomizationLayer } from "@/lib/customization/types";
import type { RlsSessionContext } from "@/lib/db/rls-context";

export type ServiceFailure = {
  ok: false;
  status: 404 | 409 | 422;
  error: string;
  conflicts?: unknown;
};

export type PublishSuccess = {
  ok: true;
  releaseId: string;
  revisionId: string;
  generation: number;
  idempotentReplay?: boolean;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function requestHash(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

async function loadActiveLayer(
  tx: CustomizationTransaction,
  resourceId: string,
): Promise<CustomizationLayer | null> {
  const [head] = await tx.read("heads", { resourceId }, true);
  if (!head?.activeReleaseId) return null;
  const [release] = await tx.read("releases", { id: head.activeReleaseId });
  if (!release) return null;
  const [revision] = await tx.read("revisions", { id: release.revisionId });
  if (!revision) return null;
  return parseBounded(layerSchema, revision.payload);
}

async function writeReleaseArtifacts(
  tx: CustomizationTransaction,
  input: {
    resourceId: string;
    scopeId: string;
    unionId: string | null;
    key: string;
    layer: CustomizationLayer;
    actorId: string;
    reason: string;
    expectedGeneration: number;
    expectedAncestorHeads: Record<string, string>;
    scopes: readonly unknown[];
    manifest?: unknown;
    sourceDependencies?: readonly unknown[];
    controlResourceIdsBySourceKey?: Record<string, string>;
    canonicalPath?: string;
    summary?: { en: string; fr: string };
    auditAction?: "publish" | "rollback";
  },
): Promise<PublishSuccess | ServiceFailure> {
  for (const [ancestorResourceId, expectedReleaseId] of Object.entries(input.expectedAncestorHeads)) {
    const [ancestorHead] = await tx.read("heads", { resourceId: ancestorResourceId }, true);
    if (!ancestorHead || ancestorHead.activeReleaseId !== expectedReleaseId) {
      return { ok: false, status: 409, error: "ancestor_head_conflict" };
    }
  }

  const [head] = await tx.read("heads", { resourceId: input.resourceId }, true);
  if (!head) return { ok: false, status: 404, error: "resource_not_found" };
  if (head.generation !== input.expectedGeneration) {
    return { ok: false, status: 409, error: "head_conflict" };
  }

  const chain = resolveScopeChain(input.scopes, input.scopeId);
  const compiled = compilePublication({
    key: input.key,
    manifest: input.manifest ?? COMPILED_DEFAULTS,
    scopes: input.scopes,
    targetScopeId: input.scopeId,
    layers: [input.layer],
    sourceDependencies: input.sourceDependencies,
    releaseId: "pending",
    resourceId: input.resourceId,
    scopeId: input.scopeId,
    controlResourceIdsBySourceKey: input.controlResourceIdsBySourceKey,
    canonicalPath: input.canonicalPath,
    summary: input.summary,
  });
  if (compiled.resolution.status !== "resolved") {
    return {
      ok: false,
      status: 422,
      error: compiled.resolution.status === "unavailable" ? compiled.resolution.reason : "unpublishable",
    };
  }

  const revisionId = newId("revision");
  const releaseId = newId("release");
  const revisionNo = (await tx.read("revisions", { resourceId: input.resourceId })).length + 1;

  // Fragments and projections are written before the head advances so readers never observe a gap.
  await tx.insert("revisions", {
    id: revisionId,
    resourceId: input.resourceId,
    scopeId: input.scopeId,
    unionId: input.unionId,
    revisionNo,
    schemaVersion: SCHEMA_VERSION,
    payload: input.layer,
    contentHash: draftContentHash(input.layer),
    createdBy: input.actorId,
    changeReason: input.reason,
  });
  await tx.insert("releases", {
    id: releaseId,
    resourceId: input.resourceId,
    scopeId: input.scopeId,
    unionId: input.unionId,
    revisionId,
    dependencyManifest: compiled.dependencyManifest,
    compiledDefaultVersion: compiled.resolution.manifestVersion,
    resolved: compiled.resolution.resource,
    publishedBy: input.actorId,
    replacesReleaseId: head.activeReleaseId,
  });

  for (const locale of ["en", "fr"] as const) {
    for (const fragment of compiled.fragmentsByLocale[locale]) {
      await tx.insert("fragments", {
        id: newId("fragment"),
        releaseId,
        resourceId: input.resourceId,
        scopeId: input.scopeId,
        unionId: input.unionId,
        locale,
        fragmentId: fragment.fragmentId,
        kind: fragment.kind,
        ordinal: fragment.ordinal,
        minimumAudience: fragment.minimumAudience,
        payload: fragment.payload,
        controlResourceIds: fragment.controlResourceIds,
      });
    }
    await tx.insert("projections", {
      id: newId("projection"),
      resourceId: input.resourceId,
      releaseId,
      scopeId: input.scopeId,
      unionId: input.unionId,
      locale,
      publicDto: compiled.projectionsByLocale[locale],
      policyVersion: 1,
    });
  }

  const nextGeneration = head.generation + 1;
  const updated = await tx.update(
    "heads",
    { resourceId: input.resourceId, generation: input.expectedGeneration },
    { activeReleaseId: releaseId, generation: nextGeneration, updatedAt: new Date() },
  );
  if (!updated.length) return { ok: false, status: 409, error: "head_conflict" };

  await writeCustomizationAudit(tx, {
    scopeId: input.scopeId,
    unionId: input.unionId,
    actorId: input.actorId,
    action: input.auditAction ?? "publish",
    resourceId: input.resourceId,
    reason: input.reason,
    metadata: {
      releaseId,
      revisionId,
      generation: nextGeneration,
      scopeChain: chain.map((scope) => scope.id),
    },
  });

  return { ok: true, releaseId, revisionId, generation: nextGeneration };
}

export type PublishInput = {
  resourceId: string;
  actorId: string;
  reason: string;
  idempotencyKey: string;
  expectedDraftLockVersion: number;
  expectedGeneration: number;
  expectedAncestorHeads?: Record<string, string>;
  scopes: readonly unknown[];
  manifest?: unknown;
  sourceDependencies?: readonly unknown[];
  controlResourceIdsBySourceKey?: Record<string, string>;
  canonicalPath?: string;
  summary?: { en: string; fr: string };
  descendantOverrides?: readonly { scopeId: string; resourceId: string; blockIds: readonly string[] }[];
  affectedReleaseCount?: number;
  requireBilingualReview?: boolean;
  layerOverride?: CustomizationLayer;
  auditAction?: "publish" | "rollback";
};

async function publishInTransaction(
  tx: CustomizationTransaction,
  input: PublishInput,
): Promise<PublishSuccess | ServiceFailure> {
  const body = {
    resourceId: input.resourceId,
    expectedDraftLockVersion: input.expectedDraftLockVersion,
    expectedGeneration: input.expectedGeneration,
    expectedAncestorHeads: input.expectedAncestorHeads ?? {},
    reason: input.reason,
    historical: input.auditAction === "rollback",
  };
  const hash = requestHash(body);

  const draft = await readDraftInTransaction(tx, input.resourceId);
  if (!draft) return { ok: false, status: 404, error: "draft_not_found" };

  const [existingOp] = await tx.read("operations", {
    actorId: input.actorId,
    scopeId: draft.scopeId,
    operationKey: input.idempotencyKey,
  });
  if (existingOp) {
    if (existingOp.requestHash !== hash) return { ok: false, status: 409, error: "idempotency_conflict" };
    return { ...(existingOp.result as PublishSuccess), idempotentReplay: true };
  }

  if (!input.layerOverride && draft.lockVersion !== input.expectedDraftLockVersion) {
    return { ok: false, status: 409, error: "draft_conflict" };
  }

  const [resource] = await tx.read("resources", { id: input.resourceId });
  if (!resource) return { ok: false, status: 404, error: "resource_not_found" };
  const key = resourceKeySchema.parse(resource.key);
  const layer = input.layerOverride ?? draft.payload;

  assertReleaseImpactBudget(input.affectedReleaseCount ?? 1);

  const currentLayer = await loadActiveLayer(tx, input.resourceId);
  const impact = previewLayerImpact({
    key,
    scopes: input.scopes,
    targetScopeId: draft.scopeId,
    currentLayers: currentLayer ? [currentLayer] : [],
    draftLayer: layer,
    descendantOverrides: (input.descendantOverrides ?? []).map((row) => ({
      scopeId: row.scopeId,
      blockIds: row.blockIds,
    })),
    affectedReleaseCount: input.affectedReleaseCount ?? 1,
    manifest: input.manifest,
  });
  if (impact.conflicts.some((conflict) => conflict.kind === "orphan")) {
    return { ok: false, status: 422, error: "orphan_block_conflict", conflicts: impact.conflicts };
  }

  if (input.requireBilingualReview !== false && !input.layerOverride) {
    for (const locale of ["en", "fr"] as const) {
      if (draft.reviews[locale]?.hash !== draftContentHash(draft.payload)) {
        return { ok: false, status: 422, error: "bilingual_review_required" };
      }
    }
  }

  const published = await writeReleaseArtifacts(tx, {
    resourceId: input.resourceId,
    scopeId: draft.scopeId,
    unionId: draft.unionId,
    key,
    layer,
    actorId: input.actorId,
    reason: input.reason,
    expectedGeneration: input.expectedGeneration,
    expectedAncestorHeads: input.expectedAncestorHeads ?? {},
    scopes: input.scopes,
    manifest: input.manifest,
    sourceDependencies: input.sourceDependencies,
    controlResourceIdsBySourceKey: input.controlResourceIdsBySourceKey,
    canonicalPath: input.canonicalPath,
    summary: input.summary,
    auditAction: input.auditAction,
  });
  if (!published.ok) return published;

  await tx.insert("operations", {
    id: newId("op"),
    scopeId: draft.scopeId,
    unionId: draft.unionId,
    actorId: input.actorId,
    operationKey: input.idempotencyKey,
    requestHash: hash,
    result: published,
  });
  return published;
}

export async function publishAtomically(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: PublishInput,
): Promise<PublishSuccess | ServiceFailure> {
  return adapter.transaction(context, (tx) => publishInTransaction(tx, input));
}

export async function setPolicyAtomically(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: {
    resourceId: string;
    scopeId: string;
    unionId: string | null;
    actorId: string;
    reason: string;
    expectedPolicyVersion: number;
    audience?: Audience;
    enabled?: boolean;
    withdrawn?: boolean;
    publicListing?: boolean;
    editableFields?: string[];
  },
): Promise<{ ok: true; policyVersion: number } | ServiceFailure> {
  return adapter.transaction(context, async (tx) => {
    const [policy] = await tx.read("policies", { resourceId: input.resourceId }, true);
    if (!policy) return { ok: false as const, status: 404 as const, error: "policy_not_found" };
    if (policy.policyVersion !== input.expectedPolicyVersion) {
      return { ok: false as const, status: 409 as const, error: "policy_conflict" };
    }
    const nextVersion = policy.policyVersion + 1;
    const updated = await tx.update(
      "policies",
      { resourceId: input.resourceId, policyVersion: input.expectedPolicyVersion },
      {
        audience: input.audience ?? policy.audience,
        enabled: input.enabled ?? policy.enabled,
        withdrawnAt: input.withdrawn === true ? new Date() : input.withdrawn === false ? null : policy.withdrawnAt,
        publicListing: input.publicListing ?? policy.publicListing,
        editableFields: input.editableFields ?? policy.editableFields,
        policyVersion: nextVersion,
        updatedBy: input.actorId,
      },
    );
    if (!updated.length) return { ok: false as const, status: 409 as const, error: "policy_conflict" };
    await writeCustomizationAudit(tx, {
      scopeId: input.scopeId,
      unionId: input.unionId,
      actorId: input.actorId,
      action: input.withdrawn ? "withdraw" : "policy",
      resourceId: input.resourceId,
      reason: input.reason,
      metadata: { policyVersion: nextVersion, withdrawn: Boolean(input.withdrawn) },
    });
    return { ok: true as const, policyVersion: nextVersion };
  });
}

/** Rollback copies a historical revision into a new release; current restrictive policy is preserved. */
export async function rollbackToRevision(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: PublishInput & { historicalRevisionId: string },
): Promise<PublishSuccess | ServiceFailure> {
  return adapter.transaction(context, async (tx) => {
    const [revision] = await tx.read("revisions", { id: input.historicalRevisionId });
    if (!revision || revision.resourceId !== input.resourceId) {
      return { ok: false as const, status: 404 as const, error: "revision_not_found" };
    }
    const layer = parseBounded(layerSchema, revision.payload);
    const draft = await readDraftInTransaction(tx, input.resourceId);
    if (!draft) return { ok: false as const, status: 404 as const, error: "draft_not_found" };
    await tx.update(
      "drafts",
      { resourceId: input.resourceId, lockVersion: draft.lockVersion },
      {
        payload: layer,
        lockVersion: draft.lockVersion + 1,
        updatedBy: input.actorId,
        updatedAt: new Date(),
        reviews: {},
      },
    );
    return publishInTransaction(tx, {
      ...input,
      expectedDraftLockVersion: draft.lockVersion + 1,
      requireBilingualReview: false,
      layerOverride: layer,
      auditAction: "rollback",
    });
  });
}

/** Remove the active override (inherit). Distinct from withdrawal. */
export async function inheritAgain(
  adapter: CustomizationAdapter,
  context: RlsSessionContext,
  input: {
    resourceId: string;
    actorId: string;
    reason: string;
    expectedLockVersion: number;
    key: string;
    scopes: readonly unknown[];
    descendantOverrides?: readonly { scopeId: string; blockIds: readonly string[] }[];
    affectedReleaseCount?: number;
  },
): Promise<{ ok: true; lockVersion: number } | ServiceFailure> {
  return adapter.transaction(context, async (tx) => {
    const draft = await readDraftInTransaction(tx, input.resourceId);
    if (!draft) return { ok: false as const, status: 404 as const, error: "draft_not_found" };
    if (draft.lockVersion !== input.expectedLockVersion) {
      return { ok: false as const, status: 409 as const, error: "draft_conflict" };
    }
    const inheritLayer = parseBounded(layerSchema, {
      schemaVersion: SCHEMA_VERSION,
      key: resourceKeySchema.parse(input.key),
      scopeId: draft.scopeId,
      revisionId: newId("inherit"),
      mode: "inherit",
    });
    const current = await loadActiveLayer(tx, input.resourceId);
    const impact = previewLayerImpact({
      key: input.key,
      scopes: input.scopes,
      targetScopeId: draft.scopeId,
      currentLayers: current ? [current] : [],
      draftLayer: inheritLayer,
      descendantOverrides: input.descendantOverrides ?? [],
      affectedReleaseCount: input.affectedReleaseCount ?? 1,
    });
    if (impact.conflicts.some((conflict) => conflict.kind === "orphan")) {
      return { ok: false as const, status: 422 as const, error: "orphan_block_conflict", conflicts: impact.conflicts };
    }
    const nextVersion = draft.lockVersion + 1;
    const updated = await tx.update(
      "drafts",
      { resourceId: input.resourceId, lockVersion: input.expectedLockVersion },
      { payload: inheritLayer, lockVersion: nextVersion, updatedBy: input.actorId, updatedAt: new Date() },
    );
    if (!updated.length) return { ok: false as const, status: 409 as const, error: "draft_conflict" };
    await writeCustomizationAudit(tx, {
      scopeId: draft.scopeId,
      unionId: draft.unionId,
      actorId: input.actorId,
      action: "inherit",
      resourceId: input.resourceId,
      reason: input.reason,
      metadata: { lockVersion: nextVersion },
    });
    return { ok: true as const, lockVersion: nextVersion };
  });
}
