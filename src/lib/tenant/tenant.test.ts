import { describe, it, expect } from "vitest";
import { getTenantByUnionSlug, getTenantContext } from "@/lib/tenant/loader";
import { getVisibleModules, canAccessModule } from "@/lib/modules/registry";

describe("tenant loader", () => {
  it("loads reference tenant by slug", () => {
    const tenant = getTenantByUnionSlug("opseu");
    expect(tenant?.union.name).toBe("OPSEU");
    expect(tenant?.locals?.[0]?.localNumber).toBe("243");
    expect(tenant?.locals).toHaveLength(2);
    expect(tenant?.bargainingUnits?.length).toBeGreaterThanOrEqual(2);
  });

  it("returns tenant context with brand defaults", () => {
    const ctx = getTenantContext("union-opseu");
    expect(ctx?.brandDefaults.primaryColor).toBe("#003DA5");
    expect(ctx?.union.enabledModules).toContain("grievance");
  });
});

describe("module registry", () => {
  it("shows comms for all enabled modules", () => {
    const mods = getVisibleModules(["comms", "grievance"], ["local_steward"]);
    expect(mods.map((m) => m.id)).toContain("comms");
    expect(mods.map((m) => m.id)).toContain("grievance");
  });

  it("hides bumping when not enabled", () => {
    const mods = getVisibleModules(["comms"], ["local_president"]);
    expect(mods.map((m) => m.id)).not.toContain("bumping");
  });

  it("requires MFA for grievance access", () => {
    const mod = getVisibleModules(["grievance"], ["local_president"])[0];
    expect(canAccessModule(mod, ["grievance"], ["local_president"], false)).toBe(
      false,
    );
    expect(canAccessModule(mod, ["grievance"], ["local_president"], true)).toBe(
      true,
    );
  });
});
