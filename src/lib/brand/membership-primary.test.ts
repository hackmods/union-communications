import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPSEU_SECTOR_ID,
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_CAAT_SUPPORT_FT_LABEL,
  OPSEU_CAAT_SUPPORT_ID,
  OPSEU_CAAT_SUPPORT_PT_ID,
  OPSEU_CAAT_SUPPORT_PT_LABEL,
} from "@/lib/brand/opseu-sector-catalog";
import { applyBrandKitProfile, normalizeBrandKit } from "@/lib/utils/local-links";
import {
  alignOpseuMembershipPrimary,
  membershipAudienceOptions,
  membershipUrlsForOpseuSector,
  OPSEU_GENERIC_MEMBERSHIP_ID,
  OPSEU_GENERIC_MEMBERSHIP_LABEL,
  OPSEU_MEMBERSHIP_FORM_URL,
  opseuCollectionMembershipAudience,
} from "./membership-primary";
import type { BrandKitProfile, MembershipUrl } from "@/types/entities";

const SEED_URLS: MembershipUrl[] = [
  {
    id: "membership-ft",
    label: "CAAT Support Full-Time",
    url: "https://hub03.opseu.org/Forms/emaweb",
    audience: "full_time",
    primary: true,
  },
  {
    id: "membership-pt",
    label: "CAAT Support Part-Time",
    url: "https://hub03.opseu.org/Forms/emaweb",
    audience: "part_time",
  },
];

function legacyCaatProfiles(localNumber = "243"): BrandKitProfile[] {
  return [
    {
      id: OPSEU_CAAT_SUPPORT_FT_ID,
      label: OPSEU_CAAT_SUPPORT_FT_LABEL,
      localNumber,
      subText: OPSEU_CAAT_SUPPORT_FT_LABEL,
      bargainingUnitCode: "ft",
    },
    {
      id: OPSEU_CAAT_SUPPORT_PT_ID,
      label: OPSEU_CAAT_SUPPORT_PT_LABEL,
      localNumber,
      subText: OPSEU_CAAT_SUPPORT_PT_LABEL,
      bargainingUnitCode: "pt",
    },
    {
      id: "profile-other",
      label: "Other",
      localNumber,
      subText: "Other",
      bargainingUnitCode: "other",
    },
  ];
}

function opseuKit(activeProfileId: string, profiles?: BrandKitProfile[]) {
  return normalizeBrandKit({
    version: "2.0",
    unionPresetId: "opseu",
    opseuSectorId: DEFAULT_OPSEU_SECTOR_ID,
    activeProfileId,
    ...(profiles ? { profiles } : {}),
    local: { id: "x", localNumber: "243", subText: "Support" },
    primaryColor: "#003DA5",
    secondaryColor: "#FFFFFF",
    accentColor: "#002868",
    useOfficialLogo: true,
    membershipUrls: SEED_URLS,
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("opseuCollectionMembershipAudience", () => {
  it("maps legacy College Support FT/PT collections to join forms", () => {
    expect(opseuCollectionMembershipAudience(OPSEU_CAAT_SUPPORT_PT_ID)).toBe(
      "part_time",
    );
    expect(opseuCollectionMembershipAudience(OPSEU_CAAT_SUPPORT_FT_ID)).toBe(
      "full_time",
    );
    expect(opseuCollectionMembershipAudience(OPSEU_CAAT_SUPPORT_ID)).toBeNull();
    expect(opseuCollectionMembershipAudience("profile-other")).toBeNull();
  });
});

describe("membershipAudienceOptions", () => {
  it("offers Full-time and Part-time only for College Support", () => {
    expect(membershipAudienceOptions("opseu", "caat-support")).toEqual([
      "all",
      "full_time",
      "part_time",
    ]);
    expect(membershipAudienceOptions("opseu", undefined)).toEqual([
      "all",
      "full_time",
      "part_time",
    ]);
  });

  it("keeps All members only for other OPSEU sectors and other unions", () => {
    expect(membershipAudienceOptions("opseu", "ops")).toEqual(["all"]);
    expect(membershipAudienceOptions("opseu", "caat-academic")).toEqual([
      "all",
    ]);
    expect(membershipAudienceOptions("cupe")).toEqual(["all"]);
    expect(membershipAudienceOptions(undefined)).toEqual(["all"]);
  });
});

describe("membershipUrlsForOpseuSector", () => {
  it("returns CAAT Support Full-Time and Part-Time for College Support", () => {
    const urls = membershipUrlsForOpseuSector(
      "caat-support",
      OPSEU_CAAT_SUPPORT_ID,
    );
    expect(urls.map((row) => row.label)).toEqual([
      "CAAT Support Full-Time",
      "CAAT Support Part-Time",
    ]);
    expect(urls.map((row) => row.audience)).toEqual(["full_time", "part_time"]);
    expect(urls.every((row) => row.url === OPSEU_MEMBERSHIP_FORM_URL)).toBe(
      true,
    );
    expect(urls.find((row) => row.primary)?.audience).toBe("full_time");
  });

  it("returns one All members OPSEU Membership link for other sectors", () => {
    for (const sectorId of ["ops", "lcbo", "corrections", "other"]) {
      const urls = membershipUrlsForOpseuSector(sectorId);
      expect(urls, sectorId).toHaveLength(1);
      expect(urls[0]).toMatchObject({
        id: OPSEU_GENERIC_MEMBERSHIP_ID,
        label: OPSEU_GENERIC_MEMBERSHIP_LABEL,
        url: OPSEU_MEMBERSHIP_FORM_URL,
        audience: "all",
        primary: true,
      });
    }
  });
});

describe("alignOpseuMembershipPrimary", () => {
  it("keeps both join forms on the shared College Support collection", () => {
    const aligned = alignOpseuMembershipPrimary(
      opseuKit(OPSEU_CAAT_SUPPORT_ID),
    );
    expect(aligned.activeProfileId).toBe(OPSEU_CAAT_SUPPORT_ID);
    expect(aligned.membershipUrls?.map((row) => row.audience)).toEqual([
      "full_time",
      "part_time",
    ]);
    expect(aligned.membershipUrls?.find((row) => row.primary)?.audience).toBe(
      "full_time",
    );
  });

  it("makes Support Part-Time primary when a legacy PT collection is active", () => {
    const aligned = alignOpseuMembershipPrimary(
      opseuKit(OPSEU_CAAT_SUPPORT_PT_ID, legacyCaatProfiles()),
    );
    expect(aligned.membershipUrls?.find((row) => row.primary)?.id).toBe(
      "membership-pt",
    );
    expect(aligned.membershipUrls?.find((row) => row.primary)?.audience).toBe(
      "part_time",
    );
  });

  it("keeps Support Full-Time primary on a legacy FT collection", () => {
    const aligned = alignOpseuMembershipPrimary(
      opseuKit(OPSEU_CAAT_SUPPORT_FT_ID, legacyCaatProfiles()),
    );
    expect(aligned.membershipUrls?.find((row) => row.primary)?.id).toBe(
      "membership-ft",
    );
  });

  it("replaces leftover CAAT forms with one All members link on other sectors", () => {
    const kit = normalizeBrandKit({
      version: "2.0",
      unionPresetId: "opseu",
      opseuSectorId: "ops",
      activeProfileId: "profile-opseu-ops-unified",
      local: { id: "x", localNumber: "649", subText: "OPS Unified" },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: true,
      membershipUrls: SEED_URLS,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const aligned = alignOpseuMembershipPrimary(kit);
    expect(aligned.membershipUrls).toHaveLength(1);
    expect(aligned.membershipUrls?.[0]).toMatchObject({
      id: OPSEU_GENERIC_MEMBERSHIP_ID,
      label: OPSEU_GENERIC_MEMBERSHIP_LABEL,
      audience: "all",
      url: OPSEU_MEMBERSHIP_FORM_URL,
      primary: true,
    });
  });

  it("restores CAAT Support FT/PT when switching back from a generic All members link", () => {
    const kit = normalizeBrandKit({
      version: "2.0",
      unionPresetId: "opseu",
      opseuSectorId: "caat-support",
      activeProfileId: OPSEU_CAAT_SUPPORT_ID,
      local: {
        id: "x",
        localNumber: "243",
        subText: "College Support",
      },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: true,
      membershipUrls: membershipUrlsForOpseuSector("ops"),
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const aligned = alignOpseuMembershipPrimary(kit);
    expect(aligned.membershipUrls?.map((row) => row.label)).toEqual([
      "CAAT Support Full-Time",
      "CAAT Support Part-Time",
    ]);
  });

  it("does not rewrite a non-OPSEU kit", () => {
    const kit = normalizeBrandKit({
      version: "2.0",
      unionPresetId: "cupe",
      local: { id: "x", localNumber: "1", subText: "" },
      primaryColor: "#AF0061",
      secondaryColor: "#FFFFFF",
      accentColor: "#000000",
      useOfficialLogo: false,
      membershipUrls: SEED_URLS,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(alignOpseuMembershipPrimary(kit).membershipUrls).toBe(
      kit.membershipUrls,
    );
  });
});

describe("applyBrandKitProfile membership primary", () => {
  it("points Primary at Support Part-Time when switching a legacy kit to PT", () => {
    const switched = applyBrandKitProfile(
      opseuKit(OPSEU_CAAT_SUPPORT_FT_ID, legacyCaatProfiles()),
      OPSEU_CAAT_SUPPORT_PT_ID,
    );
    expect(switched.activeProfileId).toBe(OPSEU_CAAT_SUPPORT_PT_ID);
    expect(switched.membershipUrls?.find((row) => row.primary)?.audience).toBe(
      "part_time",
    );
    const back = applyBrandKitProfile(switched, OPSEU_CAAT_SUPPORT_FT_ID);
    expect(back.membershipUrls?.find((row) => row.primary)?.audience).toBe(
      "full_time",
    );
  });
});
