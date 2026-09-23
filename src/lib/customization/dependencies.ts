import { createHash } from "node:crypto";
import { parseBounded, resourceKeySchema, sourceDependencySchema, sourceReferenceSchema } from "@/lib/customization/schemas";
import type { GuideBlock, SourceDependency } from "@/lib/customization/types";

/** Hard publication budget from the accepted design; above this, prepare fails closed. */
export const MAX_AFFECTED_RELEASES = 500;

export type ImpactKind = "changed" | "deleted" | "orphan";
export type ImpactConflict = {
  scopeId: string;
  resourceKey: string;
  blockId: string;
  kind: ImpactKind;
};
export type ImpactReport = {
  affectedReleaseCount: number;
  conflicts: ImpactConflict[];
};

/** Stable lexicographic order so batch loads do not depend on SQL row ordering. */
export function sortByStableId<T extends { id: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

export function sortRevisionsStable<T extends { resourceId: string; revisionNo: number; id: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) => {
    if (left.resourceId !== right.resourceId) return left.resourceId < right.resourceId ? -1 : 1;
    if (left.revisionNo !== right.revisionNo) return left.revisionNo - right.revisionNo;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

/** Pin every referenced source to an exact dependency revision; ordering is deterministic. */
export function pinSourceDependencies(
  references: readonly unknown[],
  available: readonly unknown[],
): SourceDependency[] {
  const pins = references.map((entry) => parseBounded(sourceReferenceSchema, entry));
  const catalog = new Map(
    available.map((entry) => {
      const source = parseBounded(sourceDependencySchema, entry);
      return [`${source.id}@${source.revisionId}`, source] as const;
    }),
  );
  if (catalog.size !== available.length) throw new Error("Duplicate source dependency identity");
  const pinned = pins.map((reference) => {
    const source = catalog.get(`${reference.id}@${reference.revisionId}`);
    if (!source) throw new Error(`Missing pinned source dependency ${reference.id}@${reference.revisionId}`);
    return source;
  });
  return [...pinned].sort((left, right) => {
    const leftKey = `${left.id}@${left.revisionId}`;
    const rightKey = `${right.id}@${right.revisionId}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

/** Exact revision pins for a release, keyed in stable resource-key order. */
export function buildDependencyManifest(pins: Readonly<Record<string, string>>): Record<string, string> {
  const entries = Object.entries(pins).map(([key, revisionId]) => [resourceKeySchema.parse(key), revisionId] as const);
  entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return Object.fromEntries(entries);
}

export function dependencyManifestDigest(manifest: Readonly<Record<string, string>>): string {
  const normalized = buildDependencyManifest(manifest);
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function assertReleaseImpactBudget(affectedReleaseCount: number): void {
  if (!Number.isInteger(affectedReleaseCount) || affectedReleaseCount < 0) {
    throw new Error("Affected release count must be a non-negative integer");
  }
  if (affectedReleaseCount > MAX_AFFECTED_RELEASES) {
    throw new Error(`Publication affects ${affectedReleaseCount} releases; the limit is ${MAX_AFFECTED_RELEASES}`);
  }
}

/**
 * Deterministic conflict report for ancestor publication impact.
 * Orphan = descendant still targets a block the parent deleted.
 * Changed = both sides still have the block but content diverged.
 */
export function buildBlockImpactReport(input: {
  affectedReleaseCount: number;
  parentScopeId: string;
  resourceKey: string;
  beforeBlocks: readonly Pick<GuideBlock, "id" | "type">[];
  afterBlocks: readonly Pick<GuideBlock, "id" | "type">[];
  descendantOverrides: readonly { scopeId: string; blockIds: readonly string[] }[];
}): ImpactReport {
  assertReleaseImpactBudget(input.affectedReleaseCount);
  const resourceKey = resourceKeySchema.parse(input.resourceKey);
  const before = new Map(input.beforeBlocks.map((block) => [block.id, block]));
  const after = new Map(input.afterBlocks.map((block) => [block.id, block]));
  const conflicts: ImpactConflict[] = [];
  for (const [blockId, previous] of before) {
    const next = after.get(blockId);
    if (!next) {
      conflicts.push({ scopeId: input.parentScopeId, resourceKey, blockId, kind: "deleted" });
      for (const descendant of input.descendantOverrides) {
        if (descendant.blockIds.includes(blockId)) {
          conflicts.push({ scopeId: descendant.scopeId, resourceKey, blockId, kind: "orphan" });
        }
      }
    } else if (previous.type !== next.type) {
      conflicts.push({ scopeId: input.parentScopeId, resourceKey, blockId, kind: "changed" });
    }
  }
  conflicts.sort((left, right) => {
    const leftKey = `${left.scopeId}:${left.blockId}:${left.kind}`;
    const rightKey = `${right.scopeId}:${right.blockId}:${right.kind}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  return { affectedReleaseCount: input.affectedReleaseCount, conflicts };
}
