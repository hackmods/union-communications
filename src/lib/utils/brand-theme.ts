import type { BrandKit } from "@/types/entities";

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
  if (brandKit.customLogoDataUrl?.trim()) return true;
  if (brandKit.local.localNumber?.trim()) return true;
  return false;
}
