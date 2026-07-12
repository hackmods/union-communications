import type { BrandKit } from "@/types/entities";
import { isUnionOpsLogoSrc } from "@/lib/constants/unionPresets";

function isPlatformDefaultLogo(src?: string): boolean {
  return isUnionOpsLogoSrc(src);
}

/**
 * True when the local has set up enough Brand Kit identity to show
 * a lockup on solidarity posters (not the empty first-visit default).
 */
export function isBrandThemeEstablished(
  brandKit: BrandKit,
  onboardingComplete: boolean,
): boolean {
  if (onboardingComplete) return true;
  if (brandKit.useOfficialLogo) return true;
  if (
    brandKit.customLogoDataUrl?.trim() &&
    !isPlatformDefaultLogo(brandKit.customLogoDataUrl)
  ) {
    return true;
  }
  if (brandKit.local.localNumber?.trim()) return true;
  return false;
}
