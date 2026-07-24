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
} from "@/lib/tenant/overlay";

describe("tenant overlay", () => {
  beforeEach(() => {
    resetTenantOverlayForTests();
  });

  it("merges a new local onto the reference union without replacing seed locals", () => {
    const local = createOverlayLocal({
      unionId: "union-opseu",
      localNumber: "999",
      subText: "Test Local",
    });
    const ctx = getTenantContext("union-opseu");
    expect(ctx).not.toBeNull();
    expect(ctx!.locals.map((l) => l.localNumber)).toContain("243");
    expect(ctx!.locals.map((l) => l.localNumber)).toContain("999");
    expect(ctx!.locals.find((l) => l.id === local.id)?.subText).toBe(
      "Test Local",
    );
  });

  it("adds a collection under an existing local", () => {
    createOverlayCollection({
      unionId: "union-opseu",
      localId: "local-243",
      code: "casual",
      name: "Casual Support Staff",
    });
    const units = listBargainingUnitsForLocal("union-opseu", "local-243");
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
});
