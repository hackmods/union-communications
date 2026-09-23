import { describe, expect, it } from "vitest";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { createCustomizationResource, createCustomizationScope, listCustomizationScopes } from "@/lib/customization/admin";
import { MemoryCustomizationAdapter } from "@/lib/customization/memory-adapter";

const root: AuthorizationActor = {
  userId: "root", roles: ["platform_admin"], accountActive: true, mfaVerified: true, source: "database",
  memberships: [], assignments: [], delegations: [], circleMemberships: [],
};

describe("customization admin helpers", () => {
  it("creates system and union scopes then a resource head/policy", async () => {
    const adapter = new MemoryCustomizationAdapter({ actor: () => root, locals: [] });
    await createCustomizationScope(adapter, { userId: "root", mfaVerified: true }, {
      id: "system", kind: "system", archived: false,
    });
    await createCustomizationScope(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      id: "alpha", kind: "union", unionId: "union-alpha", parentScopeId: "system", archived: false,
    });
    const scopes = await listCustomizationScopes(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" });
    expect(scopes.map((scope) => scope.id).sort()).toEqual(["alpha", "system"]);
    const created = await createCustomizationResource(adapter, { userId: "root", mfaVerified: true, unionId: "union-alpha" }, {
      scopeId: "alpha",
      unionId: "union-alpha",
      key: "guide:custom-meeting",
      kind: "guide",
      slug: "custom-meeting",
      actorId: "root",
    });
    expect(created.resourceId).toMatch(/^resource-/);
    const heads = await adapter.transaction({ userId: "root", mfaVerified: true, unionId: "union-alpha" }, (tx) => tx.read("heads"));
    expect(heads).toHaveLength(1);
  });
});
