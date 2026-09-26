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
  getBrandThemePatch,
  getCommsPresetPatch,
  neutralBrandDefaultsForNewTenant,
  resetTenantOverlayForTests,
  setBrandThemePatch,
  setCommsPresetPatch,
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

  it("binds and clears a Comms preset on the static reference union", () => {
    setCommsPresetPatch("union-b7p", "cupe");
    expect(getCommsPresetPatch("union-b7p")).toBe("cupe");
    expect(getTenantByUnionId("union-b7p")?.brandDefaults.commsPresetId).toBe(
      "cupe",
    );

    setCommsPresetPatch("union-b7p", null);
    expect(getCommsPresetPatch("union-b7p")).toBeNull();
    expect(
      getTenantByUnionId("union-b7p")?.brandDefaults.commsPresetId,
    ).toBeUndefined();
  });

  it("applies an operator theme to seed colours and can clear it", () => {
    const theme = {
      primaryColor: "#112233",
      secondaryColor: "#445566",
      accentColor: "#778899",
    };
    setBrandThemePatch("union-b7p", theme);
    expect(getBrandThemePatch("union-b7p")).toEqual(theme);
    const bound = getTenantByUnionId("union-b7p")?.brandDefaults;
    expect(bound?.brandTheme).toEqual(theme);
    expect(bound?.primaryColor).toBe("#112233");

    setBrandThemePatch("union-b7p", null);
    expect(getBrandThemePatch("union-b7p")).toBeNull();
    expect(getTenantByUnionId("union-b7p")?.brandDefaults.brandTheme).toBeUndefined();
  });
});
