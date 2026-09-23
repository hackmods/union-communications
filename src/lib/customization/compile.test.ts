import { describe, expect, it } from "vitest";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { ImmutableContentCache, buildContentCacheKey } from "@/lib/customization/cache";
import {
  assertReleaseImpactBudget,
  buildBlockImpactReport,
  buildDependencyManifest,
  dependencyManifestDigest,
  MAX_AFFECTED_RELEASES,
  pinSourceDependencies,
  sortRevisionsStable,
} from "@/lib/customization/dependencies";
import { compilePublication, readPublishedContent, warmCompiledContentCache } from "@/lib/customization/compile";
import { bilingual, block, guide, input, patch, scopes, source } from "@/lib/customization/fixtures.test-support";
import { MemoryCustomizationAdapter } from "@/lib/customization/memory-adapter";

const root: AuthorizationActor = {
  userId: "root", roles: ["platform_admin"], accountActive: true, mfaVerified: true, source: "database",
  memberships: [], assignments: [], delegations: [], circleMemberships: [],
};
const member: AuthorizationActor = {
  ...root, userId: "member", roles: ["solo_account"],
  memberships: [{ unionId: "union-alpha", localId: "local-alpha-101", isPrimary: true }],
};

async function publishedFixture(options?: { targetScopeId?: string; shuffleFragments?: boolean }) {
  const targetScopeId = options?.targetScopeId ?? "alpha";
  const adapter = new MemoryCustomizationAdapter({
    actor: (id) => (id === "root" ? root : id === "member" ? member : null),
    locals: [{ unionId: "union-alpha", localId: "local-alpha-101", divisionId: "division-academic", active: true }],
  });
  const compiled = compilePublication({
    ...input(),
    targetScopeId,
    layers: [patch("alpha", { kind: "guide", title: { op: "set", value: bilingual("Alpha meeting") } })],
    releaseId: "release-1",
    resourceId: "resource-1",
    scopeId: targetScopeId,
    summary: bilingual("Summary"),
    canonicalPath: "/learn/custom/guide-meeting",
  });
  expect(compiled.resolution.status).toBe("resolved");
  await adapter.transaction({ userId: "root", mfaVerified: true }, async (tx) => {
    await tx.insert("scopes", { id: "system", kind: "system" });
  });
  const unionId = "union-alpha";
  await adapter.transaction({ userId: "root", mfaVerified: true, unionId }, async (tx) => {
    for (const scope of scopes.filter((entry) => entry.kind !== "system" && entry.unionId === unionId)) {
      await tx.insert("scopes", {
        id: scope.id,
        kind: scope.kind,
        unionId: scope.unionId,
        divisionId: "divisionId" in scope ? scope.divisionId : undefined,
        localId: "localId" in scope ? scope.localId : undefined,
        bargainingUnitId: "bargainingUnitId" in scope ? scope.bargainingUnitId : undefined,
        parentScopeId: scope.parentScopeId,
      });
    }
    await tx.insert("resources", {
      id: "resource-1", scopeId: targetScopeId, unionId, key: "guide:meeting", kind: "guide", createdBy: "root",
    });
    await tx.insert("revisions", {
      id: "revision-alpha", resourceId: "resource-1", scopeId: targetScopeId, unionId, revisionNo: 1, schemaVersion: 1,
      payload: { schemaVersion: 1, key: "guide:meeting", scopeId: "alpha", revisionId: "revision-alpha", mode: "inherit" },
      contentHash: "hash", createdBy: "root", changeReason: "publish",
    });
    await tx.insert("releases", {
      id: "release-1", resourceId: "resource-1", scopeId: targetScopeId, unionId, revisionId: "revision-alpha",
      dependencyManifest: compiled.dependencyManifest, compiledDefaultVersion: "1", publishedBy: "root",
    });
    await tx.insert("policies", {
      resourceId: "resource-1", scopeId: targetScopeId, unionId, audience: "public", enabled: true,
      policyVersion: 1, editableFields: [], updatedBy: "root",
    });
    await tx.insert("heads", {
      resourceId: "resource-1", scopeId: targetScopeId, unionId, activeReleaseId: "release-1", generation: 1,
    });
    const fragments = [...compiled.fragmentsByLocale.en];
    if (options?.shuffleFragments) fragments.reverse();
    for (const fragment of fragments) {
      await tx.insert("fragments", {
        id: `frag-${fragment.fragmentId}`,
        releaseId: "release-1",
        resourceId: "resource-1",
        scopeId: targetScopeId,
        unionId,
        locale: "en",
        fragmentId: fragment.fragmentId,
        kind: fragment.kind,
        ordinal: fragment.ordinal,
        minimumAudience: fragment.minimumAudience,
        payload: fragment.payload,
        controlResourceIds: fragment.controlResourceIds,
      });
    }
    await tx.insert("projections", {
      id: "projection-en",
      resourceId: "resource-1",
      releaseId: "release-1",
      scopeId: targetScopeId,
      unionId,
      locale: "en",
      publicDto: compiled.projectionsByLocale.en,
      policyVersion: 1,
    });
  });
  return { adapter, compiled, targetScopeId };
}

describe("customization dependency compiler", () => {
  it("pins source dependencies in stable order and digests manifests deterministically", () => {
    const first = source();
    const second = { ...source(), id: "source:other", revisionId: "source-v2" };
    const pinned = pinSourceDependencies(
      [{ id: second.id, revisionId: second.revisionId }, { id: first.id, revisionId: first.revisionId }],
      [second, first],
    );
    expect(pinned.map((entry) => `${entry.id}@${entry.revisionId}`)).toEqual([
      "source:other@source-v2",
      "source:reference@source-v1",
    ]);
    expect(dependencyManifestDigest(buildDependencyManifest({ "guide:meeting": "r2", "source:reference": "source-v1" })))
      .toBe(dependencyManifestDigest(buildDependencyManifest({ "source:reference": "source-v1", "guide:meeting": "r2" })));
    expect(() => pinSourceDependencies([{ id: first.id, revisionId: "missing" }], [first])).toThrow("Missing pinned");
  });

  it("orders revision batches independently of query row order", () => {
    const rows = [
      { id: "b", resourceId: "resource-2", revisionNo: 1 },
      { id: "a", resourceId: "resource-1", revisionNo: 2 },
      { id: "c", resourceId: "resource-1", revisionNo: 1 },
    ];
    expect(sortRevisionsStable(rows).map((row) => row.id)).toEqual(["c", "a", "b"]);
  });

  it("caps release impact at 500 and reports deterministic block conflicts", () => {
    expect(() => assertReleaseImpactBudget(MAX_AFFECTED_RELEASES + 1)).toThrow("500");
    const report = buildBlockImpactReport({
      affectedReleaseCount: 2,
      parentScopeId: "alpha",
      resourceKey: "guide:meeting",
      beforeBlocks: [block("prepare"), block("meeting")],
      afterBlocks: [block("prepare")],
      descendantOverrides: [{ scopeId: "academic", blockIds: ["meeting", "prepare"] }],
    });
    expect(report.conflicts).toEqual([
      { scopeId: "academic", resourceKey: "guide:meeting", blockId: "meeting", kind: "orphan" },
      { scopeId: "alpha", resourceKey: "guide:meeting", blockId: "meeting", kind: "deleted" },
    ]);
  });
});

describe("customization compile and reader projection", () => {
  it("compiles bilingual fragments and discovery metadata without private-only keys in public DTO", () => {
    const compiled = compilePublication({
      ...input(),
      layers: [],
      releaseId: "release-1",
      resourceId: "resource-1",
      scopeId: "full-time",
      summary: bilingual("Summary"),
    });
    expect(compiled.resolution.status).toBe("resolved");
    expect(Object.keys(compiled.projectionsByLocale.en).sort()).toEqual(["canonicalPath", "key", "summary", "title"]);
    expect(compiled.fragmentsByLocale.en.some((fragment) => fragment.fragmentId === "meeting")).toBe(true);
    expect(compiled.fragmentsByLocale.fr.find((fragment) => fragment.fragmentId === "meta")?.payload.title).toContain("(fr)");
  });

  it("returns authorized DTO independent of fragment insert order and keeps query count bounded", async () => {
    const { adapter, targetScopeId } = await publishedFixture({ shuffleFragments: true });
    let reads = 0;
    const result = await readPublishedContent({
      adapter,
      context: { unionId: "union-alpha", localId: "local-alpha-101", userId: "member" },
      key: "guide:meeting",
      locale: "en",
      scopes,
      targetScopeId,
      actor: member,
      locals: [{ unionId: "union-alpha", localId: "local-alpha-101", divisionId: "division-academic", active: true }],
      onRead: () => { reads += 1; },
    });
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved" || !("blocks" in result.content)) throw new Error("expected guide");
    expect(result.content.title).toBe("Alpha meeting");
    expect(result.content.blocks.map((entry) => entry.id)).toEqual(["prepare", "meeting"]);
    expect(reads).toBe(2);
  });

  it("isolates cache entries across locals and units with the same local number pattern", async () => {
    const cache = new ImmutableContentCache();
    const alphaKey = buildContentCacheKey({
      resourceKey: "guide:meeting",
      scopeChainIds: ["system", "alpha", "academic", "alpha-101", "full-time"],
      locale: "en",
      dependencyManifest: { "guide:meeting": "release-1" },
      releaseId: "release-1",
    });
    const siblingKey = buildContentCacheKey({
      resourceKey: "guide:meeting",
      scopeChainIds: ["system", "alpha", "academic", "alpha-101", "part-time"],
      locale: "en",
      dependencyManifest: { "guide:meeting": "release-1" },
      releaseId: "release-1",
    });
    expect(alphaKey).not.toBe(siblingKey);
    warmCompiledContentCache(cache, {
      resourceKey: "guide:meeting",
      scopeChainIds: ["system", "alpha", "academic", "alpha-101", "full-time"],
      locale: "en",
      releaseId: "release-1",
      dependencyManifest: { "guide:meeting": "release-1" },
      fragments: [{ fragmentId: "meta", kind: "meta", ordinal: 0, minimumAudience: "public", payload: { key: "guide:meeting", kind: "guide", title: "FT" }, controlResourceIds: [] }],
    });
    expect(cache.get(siblingKey)).toBeUndefined();
    expect(cache.get(alphaKey)?.fragments[0]?.payload.title).toBe("FT");
  });

  it("does not let a warmed cache bypass withdrawal, and never falls back on DB errors", async () => {
    const { adapter, compiled, targetScopeId } = await publishedFixture();
    const cache = new ImmutableContentCache();
    warmCompiledContentCache(cache, {
      resourceKey: "guide:meeting",
      scopeChainIds: ["system", "alpha"],
      locale: "en",
      releaseId: "release-1",
      dependencyManifest: compiled.dependencyManifest,
      fragments: compiled.fragmentsByLocale.en,
    });
    const warmRead = await readPublishedContent({
      adapter,
      context: { unionId: "union-alpha", localId: "local-alpha-101", userId: "member" },
      key: "guide:meeting",
      locale: "en",
      scopes,
      targetScopeId,
      actor: member,
      locals: [{ unionId: "union-alpha", localId: "local-alpha-101", divisionId: "division-academic", active: true }],
      cache,
      manifest: { version: "1", resources: [guide()] },
    });
    expect(warmRead.status).toBe("resolved");

    await adapter.transaction({ userId: "root", mfaVerified: true, unionId: "union-alpha" }, (tx) =>
      tx.update("policies", { resourceId: "resource-1" }, { withdrawnAt: new Date() }));

    const withdrawn = await readPublishedContent({
      adapter,
      context: { unionId: "union-alpha", localId: "local-alpha-101", userId: "member" },
      key: "guide:meeting",
      locale: "en",
      scopes,
      targetScopeId,
      actor: member,
      locals: [{ unionId: "union-alpha", localId: "local-alpha-101", divisionId: "division-academic", active: true }],
      cache,
      manifest: { version: "1", resources: [guide()] },
    });
    expect(withdrawn).toEqual({ status: "unavailable", reason: "withdrawn" });

    const failing = {
      readerTransaction: async () => { throw new Error("db down"); },
      transaction: async () => { throw new Error("db down"); },
    };
    await expect(readPublishedContent({
      adapter: failing as never,
      context: { unionId: "union-alpha" },
      key: "guide:meeting",
      locale: "en",
      scopes,
      targetScopeId: "full-time",
      actor: null,
      locals: [],
      manifest: { version: "1", resources: [guide()] },
    })).resolves.toEqual({ status: "unavailable", reason: "service_error" });
  });

  it("falls back to compiled defaults only when nothing was published for the key", async () => {
    const adapter = new MemoryCustomizationAdapter({ actor: () => null, locals: [] });
    const result = await readPublishedContent({
      adapter,
      context: {},
      key: "guide:meeting",
      locale: "en",
      scopes,
      actor: null,
      locals: [],
      manifest: { version: "1", resources: [guide()] },
    });
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved" || !("title" in result.content)) throw new Error("expected guide");
    expect(result.content.title).toBe("Generic meeting");
  });
});
