import { describe, expect, it } from "vitest";
import { decideCapability, type AuthorizationActor } from "@/lib/authorization/model";
import { decideCustomizationManagement, customizationCapabilitySchema, maintenanceGrantSchema } from "@/lib/customization/authorization";
import { decideCustomizationRead } from "@/lib/customization/policy";
import { customizationRlsTarget, selectCustomizationContext } from "@/lib/customization/context";
import { guide, scopes } from "@/lib/customization/fixtures.test-support";

function actor(overrides: Partial<AuthorizationActor> = {}): AuthorizationActor {
  return { userId: "user-one", unionId: "union-alpha", roles: ["local_member"], memberships: [{ unionId: "union-alpha", localId: "local-alpha-101", bargainingUnitId: "unit-full-time", isPrimary: true }], assignments: [], delegations: [], circleMemberships: [], mfaVerified: true, accountActive: true, source: "database", ...overrides };
}
const target = selectCustomizationContext(scopes, "full-time");
const policy = guide().policy;
const locals = scopes.filter((scope) => scope.kind === "local").map((scope) => ({ unionId: scope.unionId!, localId: scope.localId!, divisionId: scope.divisionId, active: true }));

describe("customization management authorization", () => {
  it.each(customizationCapabilitySchema.options)("only a fresh Root can %s in another union", (capability) => {
    const other = selectCustomizationContext(scopes, "beta");
    expect(decideCustomizationManagement(actor({ roles: ["platform_admin"] }), capability, other).allowed).toBe(true);
    expect(decideCapability(actor({ roles: ["platform_admin"] }), "grievances.case.read", { unionId: "union-beta" }).allowed).toBe(false);
    expect(customizationRlsTarget(other, "user-one", true)).toEqual({ unionId: "union-beta", userId: "user-one", localId: undefined, mfaVerified: true, crossLocal: false });
  });
  it.each(["union_admin", "division_admin", "local_president", "local_exec", "local_steward", "local_member"] as const)("denies launch editing to %s", (role) => {
    expect(decideCustomizationManagement(actor({ roles: [role] }), "customization.edit", target).allowed).toBe(false);
  });
  it.each([{ accountActive: false }, { mfaVerified: false }, { source: "session" as const }])("denies stale/insecure Root actors %j", (change) => {
    expect(decideCustomizationManagement(actor({ roles: ["platform_admin"], ...change }), "customization.publish", target).allowed).toBe(false);
  });
  it("denies anonymous management and archived targets", () => {
    expect(decideCustomizationManagement(null, "customization.readDraft", target).allowed).toBe(false);
    expect(decideCustomizationManagement(actor({ roles: ["platform_admin"] }), "customization.publish", { ...target, archived: true }).allowed).toBe(false);
  });
  it("validates future grants without adding an authority path", () => {
    const grant = { id: "g", userId: "user-one", unionId: "union-alpha", scopeId: "alpha", capabilities: ["customization.edit"], resourceKinds: ["guide"], startsAt: "2026-01-01T00:00:00Z", endsAt: "2027-01-01T00:00:00Z", revokedAt: null, grantedBy: "root", reason: "Maintenance" };
    expect(maintenanceGrantSchema.safeParse(grant).success).toBe(true);
    expect(maintenanceGrantSchema.safeParse({ ...grant, endsAt: grant.startsAt }).success).toBe(false);
    expect(decideCustomizationManagement(actor({ roles: ["union_admin"] }), "customization.edit", target).reason).toBe("root_only");
  });
});

describe("customization published audience policy", () => {
  const read = (overrides: Partial<Parameters<typeof decideCustomizationRead>[0]> = {}) => decideCustomizationRead({ actor: actor(), target, scopes, locals, policies: [policy], audience: "verified_member", ...overrides });
  it("keeps public independent of authentication", () => {
    expect(read({ actor: null, audience: "public" }).allowed).toBe(true);
    expect(read({ actor: null }).allowed).toBe(false);
  });
  it.each(["alpha", "academic", "alpha-101", "full-time"])("accepts current verified membership in %s", (scopeId) => {
    expect(read({ target: selectCustomizationContext(scopes, scopeId) }).allowed).toBe(true);
  });
  it.each(["beta", "support", "alpha-102", "part-time"])("rejects forged presentation context %s", (scopeId) => {
    expect(read({ target: selectCustomizationContext(scopes, scopeId) }).allowed).toBe(false);
  });
  it("does not accept roles, missing unit membership, stale actors or session hints as membership", () => {
    expect(read({ actor: actor({ memberships: [], roles: ["platform_admin"] }) }).allowed).toBe(false);
    expect(read({ actor: actor({ memberships: [{ unionId: "union-alpha", localId: "local-alpha-101", isPrimary: true }] }) }).allowed).toBe(false);
    expect(read({ actor: actor({ accountActive: false }) }).allowed).toBe(false);
    expect(read({ actor: actor({ source: "session" }) }).allowed).toBe(false);
  });
  it("requires an assignment in the same eligible local for officer sections", () => {
    expect(read({ audience: "local_officer" }).allowed).toBe(false);
    expect(read({ audience: "local_officer", actor: actor({ assignments: [{ unionId: "union-alpha", localId: "local-alpha-101", position: "steward" }] }) }).allowed).toBe(true);
    expect(read({ audience: "local_officer", actor: actor({ assignments: [{ unionId: "union-alpha", localId: "local-alpha-102", position: "president" }] }) }).allowed).toBe(false);
  });
  it("never loosens resource policy for a public section/source or commercial entitlement", () => {
    expect(read({ actor: null, audience: "public", entitled: true, policies: [{ ...policy, audience: "verified_member" }] }).allowed).toBe(false);
    expect(read({ audience: "public", entitled: false }).allowed).toBe(false);
  });
  it.each([{ withdrawn: true }, { toolEnabled: false }, { moduleEnabled: false }, { policies: [{ ...policy, enabled: false }] }])("denies unavailable content %j", (change) => {
    expect(read({ ...change, audience: "public" }).allowed).toBe(false);
  });
  it("rejects forged target descriptors and implicit private system scope", () => {
    if (target.kind !== "unit") throw new Error("Fixture");
    expect(read({ target: { ...target, kind: "unit", unionId: "union-beta" } }).allowed).toBe(false);
    expect(read({ target: selectCustomizationContext(scopes) }).allowed).toBe(false);
  });
  it("does not require a local customization override to verify union membership", () => {
    expect(read({ target: selectCustomizationContext(scopes, "alpha"), scopes: scopes.filter((scope) => scope.kind === "system" || scope.kind === "union") }).allowed).toBe(true);
    expect(read({ locals: locals.map((local) => ({ ...local, active: false })) }).allowed).toBe(false);
  });
});
