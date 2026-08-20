import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import {
  GENERIC_COLLECTION_PROFILE_ID,
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_CAAT_SUPPORT_FT_LABEL,
  OPSEU_CAAT_SUPPORT_PT_ID,
  OPSEU_CAAT_SUPPORT_PT_LABEL,
  addBrandKitProfile,
  collectionPatchForOpseuSector,
  collectionPatchForPreset,
  collectionProfilesForPreset,
  defaultProfilesForStoredKit,
  normalizeBrandKitProfiles,
  reconcileActiveProfileId,
  removeBrandKitProfile,
  renameBrandKitProfile,
  syncBrandKitProfilesFromLocal,
} from "./collection-profiles";

describe("collectionProfilesForPreset", () => {
  it("gives OPSEU the CAAT Support Full-time and Part-time collections by default", () => {
    const { profiles, activeProfileId, opseuSectorId } =
      collectionProfilesForPreset("opseu", "243", "Educate. Advocate. Organize.");
    expect(opseuSectorId).toBe("caat-support");
    expect(activeProfileId).toBe(OPSEU_CAAT_SUPPORT_FT_ID);
    expect(profiles.map((p) => p.id)).toEqual([
      OPSEU_CAAT_SUPPORT_FT_ID,
      OPSEU_CAAT_SUPPORT_PT_ID,
      "profile-other",
    ]);
    expect(profiles[0]).toMatchObject({
      label: OPSEU_CAAT_SUPPORT_FT_LABEL,
      bargainingUnitCode: "ft",
      localNumber: "243",
    });
    expect(profiles[1]).toMatchObject({
      label: OPSEU_CAAT_SUPPORT_PT_LABEL,
      bargainingUnitCode: "pt",
    });
  });

  it("gives CUPE a FT / PT / all-employee starter list plus Other", () => {
    const { profiles, activeProfileId } = collectionProfilesForPreset(
      "cupe",
      "3902",
      "On the front line.",
    );
    expect(activeProfileId).toBe("profile-cupe-ft");
    expect(profiles.map((p) => p.label)).toEqual([
      "Full-time unit",
      "Part-time unit",
      "Casual unit",
      "All-employee unit",
      "Other",
    ]);
    expect(profiles.at(-1)?.id).toBe("profile-other");
  });

  it("loads OPS collections when OPSEU sector is ops", () => {
    const { profiles, activeProfileId, opseuSectorId } =
      collectionProfilesForPreset("opseu", "649", "Solidarity.", {
        opseuSectorId: "ops",
      });
    expect(opseuSectorId).toBe("ops");
    expect(activeProfileId).toBe("profile-opseu-ops-unified");
    expect(profiles[0]?.label).toBe("OPS Unified");
  });

  it("loads LCBO collections when OPSEU sector is lcbo", () => {
    const { profiles } = collectionProfilesForPreset("opseu", "100", "", {
      opseuSectorId: "lcbo",
    });
    expect(profiles[0]?.label).toBe("Retail stores");
    expect(profiles.at(-1)?.id).toBe("profile-other");
  });

  it("gives PSAC Treasury Board classification starters plus Other", () => {
    const { profiles } = collectionProfilesForPreset("psac", "700", "Here for Canada.");
    expect(profiles.map((p) => p.bargainingUnitCode)).toEqual([
      "pa",
      "tc",
      "eb",
      "sv",
      "fb",
      "other",
    ]);
  });

  it("gives Other and unknown presets a single Local profile", () => {
    for (const id of ["other", "bare"]) {
      const { profiles, activeProfileId } = collectionProfilesForPreset(
        id,
        "100",
        "Solidarity.",
      );
      expect(profiles).toHaveLength(1);
      expect(activeProfileId).toBe(GENERIC_COLLECTION_PROFILE_ID);
      expect(profiles[0].label).toBe("Local");
    }
  });
});

describe("collectionPatchForPreset", () => {
  it("applies the active OPSEU collection onto local identity", () => {
    const patch = collectionPatchForPreset("opseu", "243", "slogan");
    expect(patch.local?.subText).toBe(OPSEU_CAAT_SUPPORT_FT_LABEL);
    expect(patch.local?.bargainingUnitCode).toBe("ft");
    expect(patch.activeProfileId).toBe(OPSEU_CAAT_SUPPORT_FT_ID);
    expect(patch.opseuSectorId).toBe("caat-support");
  });

  it("applies corrections sector onto local identity", () => {
    const patch = collectionPatchForOpseuSector("corrections", "649", "slogan");
    expect(patch.opseuSectorId).toBe("corrections");
    expect(patch.local?.subText).toBe("Adult corrections");
    expect(patch.membershipUrls).toHaveLength(1);
    expect(patch.membershipUrls?.[0]).toMatchObject({
      label: "OPSEU / SEFPO Membership",
      audience: "all",
      url: "https://hub03.opseu.org/Forms/emaweb",
      primary: true,
    });
  });
});

describe("collectionPatchForOpseuSector", () => {
  it("is exported for sector picker", () => {
    expect(typeof collectionPatchForOpseuSector).toBe("function");
  });

  it("keeps CAAT Support Full-Time and Part-Time membership links", () => {
    const patch = collectionPatchForOpseuSector("caat-support", "243", "slogan");
    expect(patch.membershipUrls?.map((row) => row.label)).toEqual([
      "CAAT Support Full-Time",
      "CAAT Support Part-Time",
    ]);
    expect(patch.membershipUrls?.map((row) => row.audience)).toEqual([
      "full_time",
      "part_time",
    ]);
  });
});

describe("defaultProfilesForStoredKit", () => {
  it("restores OPSEU CAAT Support collections for legacy kits without profiles", () => {
    const profiles = defaultProfilesForStoredKit("opseu", "243", "ignored");
    expect(profiles).toHaveLength(3);
    expect(profiles[0]?.id).toBe(OPSEU_CAAT_SUPPORT_FT_ID);
  });

  it("uses the CUPE starter list for legacy stored presets", () => {
    const profiles = defaultProfilesForStoredKit("cupe", "100", "On the front line.");
    expect(profiles).toHaveLength(5);
    expect(profiles[0]?.label).toBe("Full-time unit");
    expect(profiles.at(-1)?.label).toBe("Other");
  });
});

describe("reconcileActiveProfileId", () => {
  it("falls back to the first profile when the active id is missing", () => {
    const profiles = defaultProfilesForStoredKit("opseu", "243", "");
    expect(
      reconcileActiveProfileId(profiles, "profile-missing"),
    ).toBe(OPSEU_CAAT_SUPPORT_FT_ID);
  });

  it("returns undefined when there are no profiles", () => {
    expect(reconcileActiveProfileId([], "profile-local")).toBeUndefined();
  });
});

describe("profile helpers", () => {
  it("honours an explicit empty profiles array", () => {
    expect(
      normalizeBrandKitProfiles([], DEFAULT_BRAND_KIT.profiles),
    ).toEqual([]);
  });
  it("normalizes junk rows and falls back when missing", () => {
    expect(normalizeBrandKitProfiles("nope", DEFAULT_BRAND_KIT.profiles)).toEqual(
      DEFAULT_BRAND_KIT.profiles,
    );
    const rows = normalizeBrandKitProfiles(
      [{ id: "  ", label: "  ", bargainingUnitCode: "  " }, { id: "ok", label: "Unit A" }],
      DEFAULT_BRAND_KIT.profiles,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("profile-0");
    expect(rows[0].label).toBe("Local");
    expect(rows[1].label).toBe("Unit A");
  });

  it("syncs the active profile from local fields", () => {
    const kit = syncBrandKitProfilesFromLocal({
      ...DEFAULT_BRAND_KIT,
      local: {
        ...DEFAULT_BRAND_KIT.local,
        localNumber: "560",
        subText: "Support Staff",
      },
    });
    expect(kit.profiles?.[0]).toMatchObject({
      id: GENERIC_COLLECTION_PROFILE_ID,
      localNumber: "560",
      subText: "Support Staff",
    });
  });

  it("syncs local number to every profile when collections are preset", () => {
    const { profiles, activeProfileId } = collectionProfilesForPreset(
      "cupe",
      "3902",
      "On the front line.",
    );
    const kit = syncBrandKitProfilesFromLocal({
      ...DEFAULT_BRAND_KIT,
      profiles,
      activeProfileId,
      local: {
        ...DEFAULT_BRAND_KIT.local,
        localNumber: "9999",
        subText: profiles[0].subText,
        bargainingUnitCode: profiles[0].bargainingUnitCode,
      },
    });
    expect(kit.profiles?.every((p) => p.localNumber === "9999")).toBe(true);
    expect(kit.profiles?.[0]).toMatchObject({ subText: profiles[0].subText });
    expect(kit.profiles?.[1]?.subText).toBe(profiles[1].subText);
  });

  it("adds and removes collections without dropping the last one", () => {
    const added = addBrandKitProfile(DEFAULT_BRAND_KIT, "Hospital Support");
    expect(added.profiles).toHaveLength(2);
    expect(added.activeProfileId).not.toBe(GENERIC_COLLECTION_PROFILE_ID);
    expect(added.profiles?.[1].label).toBe("Hospital Support");

    const removed = removeBrandKitProfile(added, added.activeProfileId!);
    expect(removed.profiles).toHaveLength(1);
    expect(removed.activeProfileId).toBe(GENERIC_COLLECTION_PROFILE_ID);

    expect(removeBrandKitProfile(removed, GENERIC_COLLECTION_PROFILE_ID)).toBe(
      removed,
    );
  });

  it("renames a profile and syncs sub-text on the active collection", () => {
    const renamed = renameBrandKitProfile(
      DEFAULT_BRAND_KIT,
      GENERIC_COLLECTION_PROFILE_ID,
      "  Workplace A  ",
    );
    expect(renamed.profiles?.[0]).toMatchObject({
      label: "Workplace A",
      subText: "Workplace A",
    });
    expect(renamed.local.subText).toBe("Workplace A");
    const blank = renameBrandKitProfile(
      renamed,
      GENERIC_COLLECTION_PROFILE_ID,
      "   ",
    );
    expect(blank.profiles?.[0].label).toBe("");
  });
});
