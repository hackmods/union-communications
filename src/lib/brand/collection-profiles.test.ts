import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import {
  GENERIC_COLLECTION_PROFILE_ID,
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_CAAT_SUPPORT_FT_LABEL,
  OPSEU_CAAT_SUPPORT_PT_ID,
  OPSEU_CAAT_SUPPORT_PT_LABEL,
  addBrandKitProfile,
  collectionPatchForPreset,
  collectionProfilesForPreset,
  defaultProfilesForStoredKit,
  normalizeBrandKitProfiles,
  reconcileActiveProfileId,
  removeBrandKitProfile,
  renameBrandKitProfile,
  syncActiveBrandKitProfile,
} from "./collection-profiles";

describe("collectionProfilesForPreset", () => {
  it("gives OPSEU the CAAT Support Full-time and Part-time collections", () => {
    const { profiles, activeProfileId } = collectionProfilesForPreset(
      "opseu",
      "243",
      "Educate. Advocate. Organize.",
    );
    expect(activeProfileId).toBe(OPSEU_CAAT_SUPPORT_FT_ID);
    expect(profiles.map((p) => p.id)).toEqual([
      OPSEU_CAAT_SUPPORT_FT_ID,
      OPSEU_CAAT_SUPPORT_PT_ID,
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

  it("gives other unions a single Local profile", () => {
    for (const id of ["cupe", "unifor", "usw", "ona", "psac", "other", "bare"]) {
      const { profiles, activeProfileId } = collectionProfilesForPreset(
        id,
        "100",
        "Solidarity.",
      );
      expect(profiles).toHaveLength(1);
      expect(activeProfileId).toBe(GENERIC_COLLECTION_PROFILE_ID);
      expect(profiles[0].label).toBe("Local");
      expect(profiles[0].subText).toBe("Solidarity.");
      expect(profiles[0].bargainingUnitCode).toBeUndefined();
    }
  });
});

describe("collectionPatchForPreset", () => {
  it("applies the active OPSEU collection onto local identity", () => {
    const patch = collectionPatchForPreset("opseu", "243", "slogan");
    expect(patch.local?.subText).toBe(OPSEU_CAAT_SUPPORT_FT_LABEL);
    expect(patch.local?.bargainingUnitCode).toBe("ft");
    expect(patch.activeProfileId).toBe(OPSEU_CAAT_SUPPORT_FT_ID);
  });
});

describe("defaultProfilesForStoredKit", () => {
  it("restores OPSEU CAAT Support collections for legacy kits without profiles", () => {
    const profiles = defaultProfilesForStoredKit("opseu", "243", "ignored");
    expect(profiles).toHaveLength(2);
    expect(profiles[0]?.id).toBe(OPSEU_CAAT_SUPPORT_FT_ID);
  });

  it("uses one Local profile for other stored presets", () => {
    const profiles = defaultProfilesForStoredKit("cupe", "100", "On the front line.");
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.label).toBe("Local");
    expect(profiles[0]?.subText).toBe("On the front line.");
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
    const kit = syncActiveBrandKitProfile({
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

  it("renames a profile and keeps a non-empty label", () => {
    const renamed = renameBrandKitProfile(
      DEFAULT_BRAND_KIT,
      GENERIC_COLLECTION_PROFILE_ID,
      "  Workplace A  ",
    );
    expect(renamed.profiles?.[0].label).toBe("Workplace A");
    const blank = renameBrandKitProfile(
      renamed,
      GENERIC_COLLECTION_PROFILE_ID,
      "   ",
    );
    expect(blank.profiles?.[0].label).toBe("");
  });
});
