import {
  DEFAULT_OPSEU_SECTOR_ID,
  inferOpseuSectorId,
  isOpseuSectorId,
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_CAAT_SUPPORT_PT_ID,
} from "@/lib/brand/opseu-sector-catalog";
import { getSeedMembershipUrlsForPreset } from "@/lib/tenant/loader";
import type {
  BrandKit,
  MembershipUrl,
  MembershipUrlAudience,
} from "@/types/entities";

/** Shared OPSEU/SEFPO membership application form (EMA). */
export const OPSEU_MEMBERSHIP_FORM_URL =
  "https://hub03.opseu.org/Forms/emaweb";

export const OPSEU_GENERIC_MEMBERSHIP_ID = "membership-all";
export const OPSEU_GENERIC_MEMBERSHIP_LABEL = "OPSEU / SEFPO Membership";

/**
 * Legacy CAAT Support FT/PT collections still select the matching join form.
 * The current College Support identity does not — both groups share a local,
 * and both application links stay listed in Brand Kit.
 */
export function opseuCollectionMembershipAudience(
  profileId: string | undefined,
): MembershipUrlAudience | null {
  if (profileId === OPSEU_CAAT_SUPPORT_PT_ID) return "part_time";
  if (profileId === OPSEU_CAAT_SUPPORT_FT_ID) return "full_time";
  return null;
}

export function withPrimaryMembershipForAudience(
  urls: MembershipUrl[] | undefined,
  audience: MembershipUrlAudience,
): MembershipUrl[] | undefined {
  if (!urls?.length) return urls;
  if (!urls.some((row) => row.audience === audience)) return urls;
  const current = urls.find((row) => row.primary);
  if (current?.audience === audience) return urls;
  let assigned = false;
  return urls.map((row) => {
    const isPrimary = !assigned && row.audience === audience;
    if (isPrimary) assigned = true;
    return { ...row, primary: isPrimary ? true : undefined };
  });
}

function cloneMembershipUrls(urls: MembershipUrl[]): MembershipUrl[] {
  return urls.map((row) => ({ ...row }));
}

function caatSupportMembershipUrls(): MembershipUrl[] {
  const seed = getSeedMembershipUrlsForPreset("opseu");
  if (seed.length > 0) return cloneMembershipUrls(seed);
  return [
    {
      id: "membership-ft",
      label: "CAAT Support Full-Time",
      url: OPSEU_MEMBERSHIP_FORM_URL,
      audience: "full_time",
      primary: true,
    },
    {
      id: "membership-pt",
      label: "CAAT Support Part-Time",
      url: OPSEU_MEMBERSHIP_FORM_URL,
      audience: "part_time",
    },
  ];
}

function genericOpseuMembershipUrls(): MembershipUrl[] {
  const seed = getSeedMembershipUrlsForPreset("opseu");
  const url = seed[0]?.url?.trim() || OPSEU_MEMBERSHIP_FORM_URL;
  return [
    {
      id: OPSEU_GENERIC_MEMBERSHIP_ID,
      label: OPSEU_GENERIC_MEMBERSHIP_LABEL,
      url,
      audience: "all",
      primary: true,
    },
  ];
}

function looksLikeCaatSupportMembership(
  urls: MembershipUrl[] | undefined,
): boolean {
  const expected = caatSupportMembershipUrls();
  if (!urls || urls.length !== expected.length) return false;
  const expectedIds = new Set(expected.map((row) => row.id));
  return urls.every((row) => expectedIds.has(row.id));
}

function looksLikeGenericOpseuMembership(
  urls: MembershipUrl[] | undefined,
): boolean {
  return urls?.length === 1 && urls[0]?.id === OPSEU_GENERIC_MEMBERSHIP_ID;
}

/**
 * Starter membership application links for an OPSEU/SEFPO sector.
 * CAAT Support keeps FT + PT join forms (two applications, one local);
 * every other sector gets one All members link to the same national EMA form.
 */
export function membershipUrlsForOpseuSector(
  sectorId: string | undefined,
  activeProfileId?: string,
): MembershipUrl[] {
  const resolved = isOpseuSectorId(sectorId)
    ? sectorId
    : DEFAULT_OPSEU_SECTOR_ID;
  if (resolved === DEFAULT_OPSEU_SECTOR_ID) {
    const urls = caatSupportMembershipUrls();
    const audience = opseuCollectionMembershipAudience(activeProfileId);
    if (!audience) return urls;
    return withPrimaryMembershipForAudience(urls, audience) ?? urls;
  }
  return genericOpseuMembershipUrls();
}

/**
 * Audience choices on Brand Kit membership links.
 * College Support is the only OPSEU / SEFPO sector with separate FT/PT
 * application forms. Other unions and sectors stay on All members.
 */
export function membershipAudienceOptions(
  unionPresetId?: string | null,
  sectorId?: string | null,
): MembershipUrlAudience[] {
  if (unionPresetId !== "opseu") return ["all"];
  const resolved = isOpseuSectorId(sectorId)
    ? sectorId
    : DEFAULT_OPSEU_SECTOR_ID;
  if (resolved === DEFAULT_OPSEU_SECTOR_ID) {
    return ["all", "full_time", "part_time"];
  }
  return ["all"];
}

function resolveOpseuSectorFromKit(kit: BrandKit): string {
  if (isOpseuSectorId(kit.opseuSectorId)) return kit.opseuSectorId;
  return inferOpseuSectorId(kit.profiles);
}

/**
 * Keep OPSEU membership starters in step with the active sector:
 * CAAT Support keeps both join forms (legacy FT/PT collections still
 * select the matching primary); other sectors swap leftover CAAT forms
 * for one All members link.
 */
export function alignOpseuMembershipPrimary(kit: BrandKit): BrandKit {
  if (kit.unionPresetId !== "opseu") return kit;
  const sectorId = resolveOpseuSectorFromKit(kit);
  const desired = membershipUrlsForOpseuSector(sectorId, kit.activeProfileId);

  if (sectorId === DEFAULT_OPSEU_SECTOR_ID) {
    if (looksLikeGenericOpseuMembership(kit.membershipUrls)) {
      return { ...kit, membershipUrls: desired };
    }
    const audience = opseuCollectionMembershipAudience(kit.activeProfileId);
    if (!audience) return kit;
    const membershipUrls = withPrimaryMembershipForAudience(
      kit.membershipUrls,
      audience,
    );
    if (membershipUrls === kit.membershipUrls) return kit;
    return { ...kit, membershipUrls };
  }

  if (looksLikeCaatSupportMembership(kit.membershipUrls)) {
    return { ...kit, membershipUrls: desired };
  }
  return kit;
}
