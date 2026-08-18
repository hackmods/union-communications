import { describe, expect, it } from "vitest";
import {
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_CAAT_SUPPORT_PT_ID,
} from "@/lib/brand/opseu-sector-catalog";
import { applyBrandKitProfile, normalizeBrandKit } from "@/lib/utils/local-links";
import {
  alignOpseuMembershipPrimary,
  opseuCollectionMembershipAudience,
} from "./membership-primary";
import type { MembershipUrl } from "@/types/entities";

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

function opseuKit(activeProfileId: string) {
  return normalizeBrandKit({
    version: "2.0",
    unionPresetId: "opseu",
    activeProfileId,
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
  it("maps College Support PT to the part-time join form", () => {
    expect(opseuCollectionMembershipAudience(OPSEU_CAAT_SUPPORT_PT_ID)).toBe(
      "part_time",
    );
    expect(opseuCollectionMembershipAudience(OPSEU_CAAT_SUPPORT_FT_ID)).toBe(
      "full_time",
    );
    expect(opseuCollectionMembershipAudience("profile-other")).toBeNull();
  });
});

describe("alignOpseuMembershipPrimary", () => {
  it("makes Support Part-Time primary when the PT collection is active", () => {
    const aligned = alignOpseuMembershipPrimary(
      opseuKit(OPSEU_CAAT_SUPPORT_PT_ID),
    );
    expect(aligned.membershipUrls?.find((row) => row.primary)?.id).toBe(
      "membership-pt",
    );
    expect(aligned.membershipUrls?.find((row) => row.primary)?.audience).toBe(
      "part_time",
    );
  });

  it("keeps Support Full-Time primary on the FT collection", () => {
    const aligned = alignOpseuMembershipPrimary(
      opseuKit(OPSEU_CAAT_SUPPORT_FT_ID),
    );
    expect(aligned.membershipUrls?.find((row) => row.primary)?.id).toBe(
      "membership-ft",
    );
  });

  it("does not rewrite a non-OPSEU kit", () => {
    const kit = normalizeBrandKit({
      version: "2.0",
      unionPresetId: "cupe",
      local: { id: "x", localNumber: "1", subText: "" },
      primaryColor: "#E5007D",
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
  it("points Primary at Support Part-Time when switching to College Support PT", () => {
    const switched = applyBrandKitProfile(
      opseuKit(OPSEU_CAAT_SUPPORT_FT_ID),
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
