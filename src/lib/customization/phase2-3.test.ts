import { describe, expect, it } from "vitest";
import {
  composePublicDiscoveryCatalog,
  mayExposeInPublicCatalog,
  sanitizePublicDiscovery,
} from "@/lib/customization/discovery";
import { validateCustomizationAssetBytes } from "@/lib/customization/assets";
import { decideWithMaintenanceGrant, isCustomizationDelegationEnabled } from "@/lib/customization/grants";
import { decideLocalParameterEdit } from "@/lib/customization/local-parameters";
import { buildWorkflowSnapshot, selectCaseWorkflow } from "@/lib/customization/workflow";
import {
  MemoryEntitlementProvider,
  isFreePublicCommsTool,
  mayEditHostedCustomization,
} from "@/lib/customization/entitlements";
import type { AuthorizationActor } from "@/lib/authorization/model";

const unionTarget = {
  id: "union-alpha",
  kind: "union" as const,
  unionId: "union-alpha",
  parentScopeId: "system",
  archived: false,
};

function actor(roles: AuthorizationActor["roles"], userId = "user-1"): AuthorizationActor {
  return {
    userId,
    roles,
    memberships: [],
    assignments: [],
    delegations: [],
    circleMemberships: [],
    source: "database",
    accountActive: true,
    mfaVerified: true,
  };
}

describe("C09 discovery sanitization", () => {
  it("drops private fields from discovery DTOs", () => {
    const dto = sanitizePublicDiscovery({
      key: "guide:custom-meeting",
      title: "Meeting",
      summary: "Safe",
      canonicalPath: "/learn/custom/x/meeting",
      privateSourceUrl: "https://secret.example",
      officerOnlyTitle: "hidden",
    });
    expect(dto).toEqual({
      key: "guide:custom-meeting",
      title: "Meeting",
      summary: "Safe",
      canonicalPath: "/learn/custom/x/meeting",
    });
    expect(dto && "privateSourceUrl" in dto).toBe(false);
  });

  it("keeps member/officer resources out of anonymous catalogs by default", () => {
    expect(mayExposeInPublicCatalog({ audience: "verified_member", enabled: true, teaserEnabled: true })).toBe(false);
    expect(mayExposeInPublicCatalog({ audience: "public", enabled: true, teaserEnabled: false })).toBe(false);
    expect(composePublicDiscoveryCatalog([{
      key: "guide:x", title: "X", summary: "", canonicalPath: "/x", secret: 1,
    }], { teaserEnabled: false })).toEqual([]);
  });
});

describe("C10 asset validation", () => {
  it("rejects SVG/HTML and oversize payloads", () => {
    expect(validateCustomizationAssetBytes("image/svg+xml", Buffer.from("<svg></svg>"))?.ok).toBe(false);
    expect(validateCustomizationAssetBytes("image/png", Buffer.from("<html><script>"))?.ok).toBe(false);
    expect(validateCustomizationAssetBytes("image/png", Buffer.alloc(6_000_000))?.ok).toBe(false);
    expect(validateCustomizationAssetBytes("image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });
});

describe("C12 workflow snapshots", () => {
  it("preserves an existing case snapshot when a newer workflow publishes", () => {
    const existing = buildWorkflowSnapshot({
      resourceKey: "workflow:ca",
      releaseId: "release-1",
      revisionId: "rev-1",
      unionId: "union-alpha",
      config: { steps: ["a"] },
    });
    const published = buildWorkflowSnapshot({
      resourceKey: "workflow:ca",
      releaseId: "release-2",
      revisionId: "rev-2",
      unionId: "union-alpha",
      config: { steps: ["a", "b"] },
    });
    expect(selectCaseWorkflow({
      existingSnapshot: existing,
      publishedSnapshot: published,
      workflowEnabled: true,
    })).toEqual(existing);
  });
});

describe("C13 grants", () => {
  it("ignores grants while delegation is disabled", () => {
    expect(isCustomizationDelegationEnabled({ CUSTOMIZATION_DELEGATION_ENABLED: "false" })).toBe(false);
    const decision = decideWithMaintenanceGrant({
      actor: actor(["union_admin"]),
      capability: "customization.edit",
      target: unionTarget,
      delegationEnabled: false,
      grants: [{
        id: "grant-1",
        userId: "user-1",
        unionId: "union-alpha",
        scopeId: "union-alpha",
        capabilities: ["customization.edit"],
        resourceKinds: ["guide"],
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2027-01-01T00:00:00.000Z",
        revokedAt: null,
        grantedBy: "root-1",
        reason: "pilot",
      }],
    });
    expect(decision.allowed).toBe(false);
  });

  it("allows edit from an active grant when delegation is enabled", () => {
    const decision = decideWithMaintenanceGrant({
      actor: actor(["local_member"]),
      capability: "customization.edit",
      target: unionTarget,
      delegationEnabled: true,
      grants: [{
        id: "grant-1",
        userId: "user-1",
        unionId: "union-alpha",
        scopeId: "union-alpha",
        capabilities: ["customization.edit"],
        resourceKinds: ["guide"],
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2027-01-01T00:00:00.000Z",
        revokedAt: null,
        grantedBy: "root-1",
        reason: "pilot",
      }],
    });
    expect(decision).toMatchObject({ allowed: true, grantId: "grant-1" });
  });
});

describe("C14 local parameters", () => {
  it("rejects field injection and steward-only edits", () => {
    expect(decideLocalParameterEdit({
      hasLocalMembership: true,
      hasExecutiveAssignment: true,
      hasParameterDelegation: false,
      isStewardOnly: false,
      proposed: { contactEmail: "a@example.org", audience: "public" },
      editableFields: ["contactEmail"],
    }).allowed).toBe(false);

    expect(decideLocalParameterEdit({
      hasLocalMembership: true,
      hasExecutiveAssignment: false,
      hasParameterDelegation: false,
      isStewardOnly: true,
      proposed: { contactEmail: "a@example.org" },
      editableFields: ["contactEmail"],
    })).toMatchObject({ allowed: false, reason: "steward_readonly" });
  });
});

describe("C15 entitlements", () => {
  it("blocks hosted edits without maintenance entitlement and never paywalls free Comms", async () => {
    const provider = new MemoryEntitlementProvider();
    expect(await mayEditHostedCustomization({ unionId: "union-alpha", provider })).toMatchObject({
      allowed: true,
      reason: "entitlements_not_configured",
    });
    await provider.upsert({
      id: "ent-1",
      unionId: "union-alpha",
      featureKey: "customization.private_guides",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: null,
      state: "active",
      operatorAuditRef: "ops-1",
    });
    expect(await mayEditHostedCustomization({ unionId: "union-alpha", provider })).toMatchObject({
      allowed: false,
    });
    await provider.upsert({
      id: "ent-2",
      unionId: "union-alpha",
      featureKey: "customization.maintenance",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: null,
      state: "active",
      operatorAuditRef: "ops-2",
    });
    expect(await mayEditHostedCustomization({ unionId: "union-alpha", provider })).toMatchObject({
      allowed: true,
    });
    expect(isFreePublicCommsTool("flyer-maker")).toBe(true);
  });
});
