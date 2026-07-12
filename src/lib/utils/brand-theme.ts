import type { BrandKit } from "@/types/entities";
import { UNIONOPS_LOGOS } from "@/lib/constants/unionPresets";

function isPlatformDefaultLogo(src?: string): boolean {
  const value = src?.trim();
  if (!value) return false;
  return (
    value === UNIONOPS_LOGOS.mark ||
    value === UNIONOPS_LOGOS.lockup ||
    value === UNIONOPS_LOGOS.markOnDark
  );
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
