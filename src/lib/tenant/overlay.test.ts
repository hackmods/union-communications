import { describe, expect, it, beforeEach } from "vitest";
import {
  getTenantByUnionId,
  getTenantContext,
  listBargainingUnitsForLocal,
} from "@/lib/tenant/loader";
import {
  createOverlayLocal,
  createOverlayCollection,
  createOverlayUnion,
  neutralBrandDefaultsForNewTenant,
  resetTenantOverlayForTests,
  setDataModulePatch,
} from "@/lib/tenant/overlay";

describe("tenant overlay", () => {
  beforeEach(() => {
    resetTenantOverlayForTests();
  });

  it("merges a new local onto the reference union without replacing seed locals", () => {
    const local = createOverlayLocal({
      unionId: "union-b7p",
      localNumber: "999",
      subText: "Test Local",
    });
    const ctx = getTenantContext("union-b7p");
    expect(ctx).not.toBeNull();
    expect(ctx!.locals.map((l) => l.localNumber)).toContain("777");
    expect(ctx!.locals.map((l) => l.localNumber)).toContain("999");
    expect(ctx!.locals.find((l) => l.id === local.id)?.subText).toBe(
      "Test Local",
    );
  });

  it("adds a collection under an existing local", () => {
    createOverlayCollection({
      unionId: "union-b7p",
      localId: "local-7",
      code: "casual",
      name: "Casual Support Staff",
    });
    const units = listBargainingUnitsForLocal("union-b7p", "local-7");
    expect(units.map((u) => u.code)).toContain("casual");
    expect(units.map((u) => u.code)).toContain("ft");
  });

  it("provisions a new union without OPSEU branding or seed clone", () => {
    const seed = createOverlayUnion({
      name: "Example Workers Union",
      slug: "example-wu",
      localNumber: "1",
      collectionCode: "ft",
      collectionName: "Full-time",
    });
    expect(seed.union.slug).toBe("example-wu");
    expect(seed.union.name).not.toMatch(/opseu/i);
    expect(seed.brandDefaults.assetPackPath).not.toContain("caat-opseu");
    expect(seed.brandDefaults.membershipUrls).toEqual([]);

    const neutral = neutralBrandDefaultsForNewTenant();
    expect(seed.brandDefaults.primaryColor).toBe(neutral.primaryColor);

    const loaded = getTenantByUnionId(seed.union.id);
    expect(loaded?.union.name).toBe("Example Workers Union");
    expect(loaded?.locals?.[0]?.localNumber).toBe("1");
  });

  it("clears Data module patches so later tests cannot inherit an enabled flag", () => {
    setDataModulePatch("union-b7p", true);
    expect(getTenantContext("union-b7p")?.union.enabledModules).toContain("data");

    resetTenantOverlayForTests();
    expect(getTenantContext("union-b7p")?.union.enabledModules).not.toContain(
      "data",
    );
  });
});
