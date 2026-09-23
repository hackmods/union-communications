import { describe, expect, it } from "vitest";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { draftContentHash, saveDraft } from "@/lib/customization/drafts";
import { bilingual, block, guide, scopes } from "@/lib/customization/fixtures.test-support";
import { MemoryCustomizationAdapter } from "@/lib/customization/memory-adapter";
import { previewDraftContent } from "@/lib/customization/preview";
import {
  inheritAgain,
  publishAtomically,
  rollbackToRevision,
  setPolicyAtomically,
} from "@/lib/customization/publish";
import { SCHEMA_VERSION, layerSchema, parseBounded } from "@/lib/customization/schemas";
import { readPublishedContent } from "@/lib/customization/compile";

const root: AuthorizationActor = {
  userId: "root", roles: ["platform_admin"], accountActive: true, mfaVerified: true, source: "database",
  memberships: [], assignments: [], delegations: [], circleMemberships: [],
};
const member: AuthorizationActor = {
  ...root, userId: "member", roles: ["solo_account"],
  memberships: [{ unionId: "union-alpha", localId: "local-alpha-101", isPrimary: true }],
};

function defineLayer(revisionId = "draft-1") {
  const resource = guide();
  if (resource.payload.kind !== "guide") throw new Error("expected guide");
  resource.payload.title = bilingual("Published meeting");
  return parseBounded(layerSchema, {
    schemaVersion: SCHEMA_VERSION,
    key: "guide:meeting",
    scopeId: "alpha",
    revisionId,
    mode: "define",
    resource,
  });
}

function reviewed(layer: ReturnType<typeof defineLayer>) {
  const hash = draftContentHash(layer);
  return {
    hash,
    reviews: {
      en: { hash, reviewedBy: "root", reviewedAt: "2026-09-22T00:00:00.000Z" },
      fr: { hash, reviewedBy: "root", reviewedAt: "2026-09-22T00:00:00.000Z" },
    },
  };
}

async function seedResource(adapter: MemoryCustomizationAdapter) {
  await adapter.transaction({ userId: "root", mfaVerified: true }, (tx) =>
    tx.insert("scopes", { id: "system", kind: "system" }));
  await adapter.transaction({ userId: "root", mfaVerified: true, unionId: "union-alpha" }, async (tx) => {
    await tx.insert("scopes", { id: "alpha", kind: "union", unionId: "union-alpha", parentScopeId: "system" });
    await tx.insert("resources", {
      id: "resource-1", scopeId: "alpha", unionId: "union-alpha", key: "guide:meeting", kind: "guide", createdBy: "root",
    });
    await tx.insert("heads", {
      resourceId: "resource-1", scopeId: "alpha", unionId: "union-alpha", generation: 1,
    });
    await tx.insert("policies", {
      resourceId: "resource-1", scopeId: "alpha", unionId: "union-alpha", audience: "public", enabled: true,
      policyVersion: 1, editableFields: ["title", "blocks", "sources"], updatedBy: "root",
    });
  });
}

describe("customization drafts preview publish", () => {
  it("saves drafts optimistically and previews privately with no-store", async () => {
    const adapter = new MemoryCustomizationAdapter({ actor: () => root, locals: [] });
    await seedResource(adapter);
    const layer = defineLayer();
    const { hash, reviews } = reviewed(layer);
    const saved = await saveDraft(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1",
      scopeId: "alpha",
      unionId: "union-alpha",
      actorId: "root",
      expectedLockVersion: 0,
      payload: layer,
      reviews,
      reason: "initial draft",
    });
    expect(saved).toEqual({ ok: true, lockVersion: 1 });
    const conflict = await saveDraft(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1",
      scopeId: "alpha",
      unionId: "union-alpha",
      actorId: "root",
      expectedLockVersion: 0,
      payload: layer,
      reason: "stale",
    });
    expect(conflict).toEqual({ ok: false, status: 409, error: "draft_conflict" });

    const preview = previewDraftContent({
      key: "guide:meeting",
      locale: "en",
      scopes,
      targetScopeId: "alpha",
      layers: [layer],
      reviews: { en: { hash }, fr: { hash } },
      contentHash: hash,
    });
    expect(preview.cacheControl).toBe("private, no-store");
    expect(preview.status).toBe("private");
    expect(preview.diagnostics.bilingualComplete).toBe(true);
    expect(preview.diagnostics.unreviewedLocales).toEqual([]);
  });

  it("publishes atomically with one concurrent winner and idempotent retry", async () => {
    const adapter = new MemoryCustomizationAdapter({ actor: () => root, locals: [] });
    await seedResource(adapter);
    const layer = defineLayer();
    const { reviews } = reviewed(layer);
    await saveDraft(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1", scopeId: "alpha", unionId: "union-alpha", actorId: "root",
      expectedLockVersion: 0, payload: layer, reviews, reason: "draft",
    });

    const base = {
      resourceId: "resource-1",
      actorId: "root",
      reason: "publish v1",
      idempotencyKey: "publish-1",
      expectedDraftLockVersion: 1,
      expectedGeneration: 1,
      scopes,
      requireBilingualReview: true,
    };
    const [first, second] = await Promise.all([
      publishAtomically(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, base),
      publishAtomically(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
        ...base,
        idempotencyKey: "publish-2",
      }),
    ]);
    const outcomes = [first, second].map((result) => result.ok);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(outcomes.filter((ok) => !ok)).toHaveLength(1);

    const winner = first.ok ? first : second;
    expect(winner.ok).toBe(true);
    if (!winner.ok) throw new Error("expected winner");
    const replay = await publishAtomically(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      ...base,
      idempotencyKey: first.ok ? "publish-1" : "publish-2",
      expectedGeneration: 1,
    });
    expect(replay).toMatchObject({ ok: true, idempotentReplay: true, releaseId: winner.releaseId });

    const releases = await adapter.transaction({ userId: "root", mfaVerified: true, unionId: "union-alpha" }, (tx) => tx.read("releases"));
    const audits = await adapter.transaction({ userId: "root", mfaVerified: true, unionId: "union-alpha" }, (tx) => tx.read("audit"));
    expect(releases).toHaveLength(1);
    expect(audits.filter((row) => row.action === "publish")).toHaveLength(1);
  });

  it("rolls back audit failures and blocks silent orphan overrides", async () => {
    const adapter = new MemoryCustomizationAdapter({ actor: () => root, locals: [] });
    await seedResource(adapter);
    const layer = defineLayer();
    const { reviews } = reviewed(layer);
    await saveDraft(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1", scopeId: "alpha", unionId: "union-alpha", actorId: "root",
      expectedLockVersion: 0, payload: layer, reviews, reason: "draft",
    });

    await expect(adapter.transaction({ userId: "root", mfaVerified: true, unionId: "union-alpha" }, async (tx) => {
      await tx.update("heads", { resourceId: "resource-1", generation: 1 }, { generation: 2 });
      throw new Error("audit failed");
    })).rejects.toThrow("audit failed");
    expect(await adapter.transaction({ userId: "root", mfaVerified: true, unionId: "union-alpha" }, (tx) => tx.read("heads")))
      .toMatchObject([{ generation: 1 }]);

    const published = await publishAtomically(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1", actorId: "root", reason: "publish", idempotencyKey: "p1",
      expectedDraftLockVersion: 1, expectedGeneration: 1, scopes,
    });
    if (!published.ok) throw new Error(`publish failed: ${JSON.stringify(published)}`);
    expect(published.ok).toBe(true);

    const removedMeeting = defineLayer("draft-2");
    if (removedMeeting.mode !== "define" || removedMeeting.resource.payload.kind !== "guide") throw new Error("define");
    removedMeeting.resource.payload = {
      ...removedMeeting.resource.payload,
      title: bilingual("No meeting block"),
      blocks: [block("prepare")],
      sources: [],
    };
    const removed = reviewed(removedMeeting);
    await saveDraft(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1", scopeId: "alpha", unionId: "union-alpha", actorId: "root",
      expectedLockVersion: 1, payload: removedMeeting, reviews: removed.reviews, reason: "remove meeting",
    });
    const orphaned = await publishAtomically(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1", actorId: "root", reason: "publish remove", idempotencyKey: "p2",
      expectedDraftLockVersion: 2, expectedGeneration: 2, scopes,
      descendantOverrides: [{ scopeId: "academic", resourceId: "child", blockIds: ["meeting"] }],
    });
    expect(orphaned).toMatchObject({ ok: false, status: 422, error: "orphan_block_conflict" });
  });

  it("withdraws independently of editorial state and rollback preserves restrictive policy", async () => {
    const adapter = new MemoryCustomizationAdapter({
      actor: (id) => (id === "root" ? root : id === "member" ? member : null),
      locals: [{ unionId: "union-alpha", localId: "local-alpha-101", divisionId: "division-academic", active: true }],
    });
    await seedResource(adapter);
    const layer = defineLayer();
    const { reviews } = reviewed(layer);
    await saveDraft(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1", scopeId: "alpha", unionId: "union-alpha", actorId: "root",
      expectedLockVersion: 0, payload: layer, reviews, reason: "draft",
    });
    const published = await publishAtomically(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1", actorId: "root", reason: "publish", idempotencyKey: "pub",
      expectedDraftLockVersion: 1, expectedGeneration: 1, scopes,
    });
    expect(published.ok).toBe(true);
    if (!published.ok) throw new Error("publish failed");

    const withdrawn = await setPolicyAtomically(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1", scopeId: "alpha", unionId: "union-alpha", actorId: "root",
      reason: "emergency withdraw", expectedPolicyVersion: 1, withdrawn: true,
    });
    expect(withdrawn).toEqual({ ok: true, policyVersion: 2 });

    const hidden = await readPublishedContent({
      adapter,
      context: { unionId: "union-alpha", localId: "local-alpha-101", userId: "member" },
      key: "guide:meeting",
      locale: "en",
      scopes,
      targetScopeId: "alpha",
      actor: member,
      locals: [{ unionId: "union-alpha", localId: "local-alpha-101", divisionId: "division-academic", active: true }],
      manifest: { version: "1", resources: [] },
    });
    // Without a warmed cache, withdrawal looks like missing and falls back to empty manifest.
    expect(hidden.status === "missing" || hidden.status === "unavailable").toBe(true);

    const rolled = await rollbackToRevision(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1",
      actorId: "root",
      reason: "rollback",
      idempotencyKey: "rollback-1",
      expectedDraftLockVersion: 1,
      expectedGeneration: 2,
      scopes,
      historicalRevisionId: published.revisionId,
      requireBilingualReview: false,
    });
    expect(rolled.ok).toBe(true);
    const policy = await adapter.transaction({ userId: "root", mfaVerified: true, unionId: "union-alpha" }, (tx) => tx.read("policies"));
    expect(policy[0]?.withdrawnAt).toBeTruthy();

    const inherited = await inheritAgain(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      resourceId: "resource-1",
      actorId: "root",
      reason: "inherit again",
      expectedLockVersion: 2,
      key: "guide:meeting",
      scopes,
    });
    expect(inherited).toEqual({ ok: true, lockVersion: 3 });
  });
});
