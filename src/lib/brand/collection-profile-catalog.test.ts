import { describe, expect, it } from "vitest";
import {
  PRESET_IDS_WITH_COLLECTION_CATALOG,
  PROFILE_OTHER_ID,
  UNION_COLLECTION_CATALOGS,
  getUnionCollectionCatalog,
  isPresetWithCollectionCatalog,
} from "./collection-profile-catalog";

describe("collection-profile-catalog", () => {
  it("ships starter lists for CUPE, Unifor, USW, ONA, and PSAC", () => {
    expect(PRESET_IDS_WITH_COLLECTION_CATALOG).toEqual([
      "cupe",
      "unifor",
      "usw",
      "ona",
      "psac",
    ]);
    for (const id of PRESET_IDS_WITH_COLLECTION_CATALOG) {
      const catalog = UNION_COLLECTION_CATALOGS[id];
      expect(catalog.referenceUrl).toMatch(/^https:\/\//);
      expect(catalog.profiles.length).toBeGreaterThan(1);
      expect(catalog.profiles.some((row) => row.id === PROFILE_OTHER_ID)).toBe(
        true,
      );
      expect(catalog.defaultActiveId).toBeTruthy();
      expect(
        catalog.profiles.some((row) => row.id === catalog.defaultActiveId),
      ).toBe(true);
    }
  });

  it("uses general union homepages as reference URLs only", () => {
    expect(UNION_COLLECTION_CATALOGS.cupe.referenceUrl).toBe("https://cupe.ca");
    expect(UNION_COLLECTION_CATALOGS.unifor.referenceUrl).toBe(
      "https://www.unifor.org",
    );
    expect(UNION_COLLECTION_CATALOGS.usw.referenceUrl).toBe("https://usw.ca");
    expect(UNION_COLLECTION_CATALOGS.ona.referenceUrl).toBe("https://ona.org");
    expect(UNION_COLLECTION_CATALOGS.psac.referenceUrl).toBe(
      "https://psacunion.ca",
    );
  });

  it("includes PSAC Treasury Board classification starters", () => {
    expect(
      UNION_COLLECTION_CATALOGS.psac.profiles.map((row) => row.bargainingUnitCode),
    ).toEqual(["pa", "tc", "eb", "sv", "other"]);
  });

  it("guards catalog lookup helpers", () => {
    expect(isPresetWithCollectionCatalog("cupe")).toBe(true);
    expect(isPresetWithCollectionCatalog("opseu")).toBe(false);
    expect(getUnionCollectionCatalog("usw")?.defaultActiveId).toBe(
      "profile-usw-unit",
    );
    expect(getUnionCollectionCatalog("missing")).toBeUndefined();
  });
});
