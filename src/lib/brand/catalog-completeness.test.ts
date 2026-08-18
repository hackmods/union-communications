import { describe, expect, it } from "vitest";
import {
  expectCompleteStarterLists,
  starterListGaps,
} from "./catalog-completeness";
import {
  PRESET_IDS_WITH_COLLECTION_CATALOG,
  PROFILE_OTHER_ID,
  UNION_COLLECTION_CATALOGS,
  getUnionCollectionCatalog,
  isPresetWithCollectionCatalog,
} from "./collection-profile-catalog";
import {
  DEFAULT_OPSEU_SECTOR_ID,
  OPSEU_SECTOR_CATALOG,
  OPSEU_SECTOR_IDS,
  getOpseuSector,
} from "./opseu-sector-catalog";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const brandKitEn = en.brandKit as {
  profilePresetHint: Record<string, string>;
  opseuSector: Record<string, string>;
};
const brandKitFr = fr.brandKit as {
  profilePresetHint: Record<string, string>;
  opseuSector: Record<string, string>;
};

describe("starter list completeness", () => {
  it("rejects stub Additional-unit catalogs", () => {
    const gaps = starterListGaps({
      id: "stub-union",
      referenceUrl: "https://example.org",
      profiles: [
        { id: "profile-a", label: "Bargaining unit", bargainingUnitCode: "bu" },
        {
          id: "profile-b",
          label: "Additional bargaining unit",
          bargainingUnitCode: "bu-add",
        },
        { id: PROFILE_OTHER_ID, label: "Other", bargainingUnitCode: "other" },
      ],
      defaultActiveId: "profile-a",
    });
    expect(gaps.some((gap) => gap.includes("stub label"))).toBe(true);
  });

  it("requires a named code on every row", () => {
    const gaps = starterListGaps({
      id: "no-code",
      referenceUrl: "https://example.org",
      profiles: [
        { id: "profile-a", label: "Full-time unit", bargainingUnitCode: "ft" },
        { id: "profile-b", label: "Part-time unit", bargainingUnitCode: "" },
        { id: PROFILE_OTHER_ID, label: "Other", bargainingUnitCode: "other" },
      ],
      defaultActiveId: "profile-a",
    });
    expect(gaps.some((gap) => gap.includes("missing bargainingUnitCode"))).toBe(
      true,
    );
  });

  it("ships complete starter lists for every solidarity-union preset", () => {
    expectCompleteStarterLists(
      PRESET_IDS_WITH_COLLECTION_CATALOG.map((id) => {
        const catalog = UNION_COLLECTION_CATALOGS[id];
        return {
          id,
          referenceUrl: catalog.referenceUrl,
          structureUrl: catalog.structureUrl,
          profiles: catalog.profiles,
          defaultActiveId: catalog.defaultActiveId,
        };
      }),
    );
  });

  it("ships complete starter lists for every OPSEU sector", () => {
    expectCompleteStarterLists(
      OPSEU_SECTOR_IDS.map((id) => {
        const sector = OPSEU_SECTOR_CATALOG[id];
        return {
          id: `opseu-${id}`,
          referenceUrl: sector.referenceUrl,
          profiles: sector.profiles,
          defaultActiveId: sector.defaultActiveId,
          allowSingleLocal: id === "other",
        };
      }),
    );
  });

  it("keeps unique OPSEU sector reference URLs except Other", () => {
    const urls = OPSEU_SECTOR_IDS.filter((id) => id !== "other").map(
      (id) => OPSEU_SECTOR_CATALOG[id].referenceUrl,
    );
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/opseu\.org\/sector\//);
    }
  });

  it("has EN/FR sector labels and preset hints for every OPSEU sector", () => {
    for (const id of OPSEU_SECTOR_IDS) {
      expect(brandKitEn.opseuSector[id], `en opseuSector.${id}`).toBeTruthy();
      expect(brandKitFr.opseuSector[id], `fr opseuSector.${id}`).toBeTruthy();
      expect(
        brandKitEn.profilePresetHint[`opseu-${id}`],
        `en profilePresetHint.opseu-${id}`,
      ).toBeTruthy();
      expect(
        brandKitFr.profilePresetHint[`opseu-${id}`],
        `fr profilePresetHint.opseu-${id}`,
      ).toBeTruthy();
    }
  });

  it("has EN/FR preset hints for every solidarity-union catalog", () => {
    for (const id of PRESET_IDS_WITH_COLLECTION_CATALOG) {
      expect(brandKitEn.profilePresetHint[id], `en hint ${id}`).toBeTruthy();
      expect(brandKitFr.profilePresetHint[id], `fr hint ${id}`).toBeTruthy();
    }
  });
});

describe("collection-profile-catalog", () => {
  it("ships starter lists for CUPE, Unifor, USW, ONA, and PSAC", () => {
    expect(PRESET_IDS_WITH_COLLECTION_CATALOG).toEqual([
      "cupe",
      "unifor",
      "usw",
      "ona",
      "psac",
    ]);
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

  it("includes all five PSAC Treasury Board classification starters", () => {
    expect(
      UNION_COLLECTION_CATALOGS.psac.profiles.map((row) => row.bargainingUnitCode),
    ).toEqual(["pa", "tc", "eb", "sv", "fb", "other"]);
  });

  it("guards catalog lookup helpers", () => {
    expect(isPresetWithCollectionCatalog("cupe")).toBe(true);
    expect(isPresetWithCollectionCatalog("opseu")).toBe(false);
    expect(getUnionCollectionCatalog("usw")?.defaultActiveId).toBe(
      "profile-usw-production",
    );
    expect(getUnionCollectionCatalog("missing")).toBeUndefined();
  });
});

describe("OPSEU sector catalog", () => {
  it("defaults unknown sector ids to CAAT Support", () => {
    expect(getOpseuSector("missing").id).toBe(DEFAULT_OPSEU_SECTOR_ID);
    expect(getOpseuSector(undefined).id).toBe(DEFAULT_OPSEU_SECTOR_ID);
  });
});
