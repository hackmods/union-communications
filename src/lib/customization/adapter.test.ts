import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryCustomizationAdapter } from "./memory-adapter";
import { getCustomizationAdapter } from "./store";
import type { AuthorizationActor } from "@/lib/authorization/model";
import type { CustomizationTransaction } from "./adapter";

const root: AuthorizationActor = { userId: "root", roles: ["platform_admin"], accountActive: true, mfaVerified: true, source: "database", memberships: [], assignments: [], delegations: [], circleMemberships: [] };
const system = { userId: "root", mfaVerified: true };
const union = { ...system, unionId: "union-a" };
async function fixture() {
  const member: AuthorizationActor = { ...root, userId: "member", roles: ["solo_account"], memberships: [{ unionId: "union-a", localId: "local-a", isPrimary: true }] };
  const adapter = new MemoryCustomizationAdapter({ actor: id => id === "root" ? root : id === "member" ? member : null, locals: [{ unionId: "union-a", localId: "local-a", active: true }] });
  await adapter.transaction(system, tx => tx.insert("scopes", { id: "system", kind: "system" }));
  await adapter.transaction(union, async tx => {
    await tx.insert("scopes", { id: "union", kind: "union", unionId: "union-a", parentScopeId: "system" });
    await tx.insert("resources", { id: "resource", scopeId: "union", unionId: "union-a", key: "guide:fixture", kind: "guide", createdBy: "root" });
    await tx.insert("heads", { resourceId: "resource", scopeId: "union", unionId: "union-a", generation: 1 });
  });
  return adapter;
}
afterEach(() => vi.unstubAllEnvs());
describe("customization transaction boundary", () => {
  it("rolls back the entire callback on an audit/publication failure", async () => {
    const adapter = await fixture();
    await expect(adapter.transaction(union, async tx => {
      await tx.update("heads", { resourceId: "resource", generation: 1 }, { generation: 2 });
      throw new Error("audit failed");
    })).rejects.toThrow("audit failed");
    expect(await adapter.transaction(union, tx => tx.read("heads"))).toMatchObject([{ generation: 1 }]);
  });
  it("serializes competing compare-and-swap writes with exactly one winner", async () => {
    const adapter = await fixture();
    const writes = await Promise.all([1,2].map(() => adapter.transaction(union, tx => tx.update("heads", { resourceId: "resource", generation: 1 }, { generation: 2 }))));
    expect(writes.map(rows => rows.length).sort()).toEqual([0,1]);
  });
  it("rejects escaped transaction handles and duplicate resource identities", async () => {
    const adapter = await fixture(); let escaped!: CustomizationTransaction;
    await adapter.transaction(union, async tx => { escaped = tx; });
    await expect(escaped.read("resources")).rejects.toThrow("closed");
    await expect(adapter.transaction(union, tx => tx.insert("resources", { id: "other", scopeId: "union", unionId: "union-a", key: "guide:fixture", kind: "guide", createdBy: "root" }))).rejects.toThrow("Duplicate");
  });
  it("does not disclose authoring data to an ordinary reader or wrong target", async () => {
    const adapter = await fixture();
    expect(await adapter.transaction({ unionId: "union-a" }, tx => tx.read("resources"))).toEqual([]);
    expect(await adapter.transaction({ ...union, unionId: "union-b" }, tx => tx.read("resources"))).toEqual([]);
    await expect(adapter.transaction({ unionId: "union-a" }, tx => tx.insert("resources", { id: "forged", scopeId: "union", unionId: "union-a", key: "guide:forged", kind: "guide", createdBy: "root" }))).rejects.toThrow("denied");
  });
  it("never falls back to memory when PostgreSQL is missing", () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(() => getCustomizationAdapter()).toThrow("requires PostgreSQL");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => new MemoryCustomizationAdapter({ actor: () => root, locals: [] })).toThrow("nonproduction");
  });
  it("matches restricted-role fragment visibility and immediate withdrawal", async () => {
    const adapter = await fixture();
    await adapter.transaction(union, async tx => {
      const scope = { resourceId: "resource", scopeId: "union", unionId: "union-a" };
      await tx.insert("revisions", { ...scope, id: "revision", revisionNo: 1, schemaVersion: 1, payload: { schemaVersion: 1, key: "guide:fixture", scopeId: "union", revisionId: "revision", mode: "inherit" }, contentHash: "test", createdBy: "root", changeReason: "test" });
      await tx.insert("releases", { ...scope, id: "release", revisionId: "revision", dependencyManifest: {}, compiledDefaultVersion: "test", publishedBy: "root" });
      await tx.insert("policies", { ...scope, audience: "public", enabled: true, policyVersion: 1, editableFields: [], updatedBy: "root" });
      for (const [ordinal, audience] of (["public", "verified_member", "local_officer"] as const).entries()) {
        await tx.insert("fragments", { ...scope, id: audience, releaseId: "release", locale: "en", fragmentId: audience, kind: "paragraph", ordinal, minimumAudience: audience, payload: { text: audience } });
      }
      await tx.update("heads", { resourceId: "resource", generation: 1 }, { activeReleaseId: "release", generation: 2 });
    });
    const read = (userId?: string) => adapter.transaction({ unionId: "union-a", userId }, async tx => (await tx.read("fragments")).map(row => row.fragmentId));
    expect(await read()).toEqual(["public"]);
    expect(await read("member")).toEqual(["public", "verified_member"]);
    expect(await adapter.readerTransaction(union, async tx => (await tx.read("fragments")).map(row => row.fragmentId))).toEqual(["public"]);
    expect(await adapter.readerTransaction(union, tx => tx.read("revisions"))).toEqual([]);
    await adapter.transaction(union, tx => tx.update("policies", { resourceId: "resource" }, { withdrawnAt: new Date() }));
    expect(await read("member")).toEqual([]);
  });
});
