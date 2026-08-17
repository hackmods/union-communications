import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPSEU_SECTOR_ID,
  getOpseuSector,
  inferOpseuSectorId,
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_SECTOR_IDS,
} from "./opseu-sector-catalog";

describe("OPSEU sector catalog", () => {
  it("includes major public-service and health-care sectors", () => {
    expect(OPSEU_SECTOR_IDS).toEqual(
      expect.arrayContaining([
        "caat-support",
        "caat-academic",
        "ops",
        "corrections",
        "lcbo",
        "hospital-professionals",
        "hospital-support",
        "municipalities",
      ]),
    );
  });

  it("defaults unknown sector ids to CAAT Support", () => {
    expect(getOpseuSector("missing").id).toBe(DEFAULT_OPSEU_SECTOR_ID);
    expect(getOpseuSector(undefined).id).toBe(DEFAULT_OPSEU_SECTOR_ID);
  });

  it("gives CAAT Support full-time and part-time starter collections", () => {
    const sector = getOpseuSector("caat-support");
    expect(sector.defaultActiveId).toBe(OPSEU_CAAT_SUPPORT_FT_ID);
    expect(sector.profiles.map((p) => p.bargainingUnitCode)).toEqual([
      "ft",
      "pt",
      "other",
    ]);
  });

  it("gives OPS a single identity plus Other", () => {
    const sector = getOpseuSector("ops");
    expect(sector.profiles).toHaveLength(2);
    expect(sector.profiles[0]?.label).toBe("Ontario Public Service");
  });

  it("infers CAAT Support from legacy profile ids", () => {
    expect(
      inferOpseuSectorId([
        { id: OPSEU_CAAT_SUPPORT_FT_ID },
        { id: "profile-caat-s-pt" },
      ]),
    ).toBe("caat-support");
  });

  it("infers CAAT Academic from faculty profile ids", () => {
    expect(
      inferOpseuSectorId([
        { id: "profile-caat-a-ft" },
        { id: "profile-caat-a-pt-sl" },
      ]),
    ).toBe("caat-academic");
  });
});
