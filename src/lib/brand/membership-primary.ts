import {
  OPSEU_CAAT_SUPPORT_FT_ID,
  OPSEU_CAAT_SUPPORT_PT_ID,
} from "@/lib/brand/opseu-sector-catalog";
import type {
  BrandKit,
  MembershipUrl,
  MembershipUrlAudience,
} from "@/types/entities";

/**
 * CAAT Support collections carry matching OPSEU join forms.
 * PT is primary when that collection is active so part-time staff are not
 * sent to the full-time application by default.
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

/** Align OPSEU CAAT Support FT/PT collections to the matching membership primary. */
export function alignOpseuMembershipPrimary(kit: BrandKit): BrandKit {
  if (kit.unionPresetId !== "opseu") return kit;
  const audience = opseuCollectionMembershipAudience(kit.activeProfileId);
  if (!audience) return kit;
  const membershipUrls = withPrimaryMembershipForAudience(
    kit.membershipUrls,
    audience,
  );
  if (membershipUrls === kit.membershipUrls) return kit;
  return { ...kit, membershipUrls };
}
