import type { BrandKit } from "@/types/entities";
import {
  OFFICIAL_LOGOS,
  isOfficialLogoVariant,
  isSelectableOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
import {
  isUnionOpsLogoSrc,
  UNIONOPS_LOGOS,
} from "@/lib/constants/unionPresets";
import {
  isLightInk,
  logoRasterFilter,
  pickContrastingInk,
  type InkTone,
} from "@/lib/utils/ink";

export type BrandLogoPresentation = {
  src: string;
  /** CSS filter for preview or canvas rasterize (Office / export embeds). */
  cssFilter?: string;
};

function resolveInk(backgroundColor?: string): InkTone | null {
  return backgroundColor?.trim()
    ? pickContrastingInk(backgroundColor.trim())
    : null;
}

function resolveOfficialPresentation(
  variant: OfficialLogoVariant,
  ink: InkTone | null,
): BrandLogoPresentation {
  const effective: OfficialLogoVariant = isSelectableOfficialLogoVariant(variant)
    ? variant
    : "mark";
  const filter = ink ? logoRasterFilter(ink) : undefined;

  if (effective === "lockup") {
    return {
      src: OFFICIAL_LOGOS.lockup.src,
      cssFilter: ink !== null ? filter : undefined,
    };
  }
  if (effective === "slitBlue") {
    return {
      src: OFFICIAL_LOGOS.slitBlue.src,
      cssFilter: ink !== null ? filter : undefined,
    };
  }
  if (effective === "slitWhite") {
    return {
      src: OFFICIAL_LOGOS.slitWhite.src,
      cssFilter: ink !== null && !isLightInk(ink) ? filter : undefined,
    };
  }

  if (ink && isLightInk(ink)) {
    return { src: OFFICIAL_LOGOS.mark.srcOnDark };
  }
  return {
    src: OFFICIAL_LOGOS.mark.src,
    cssFilter: ink !== null ? filter : undefined,
  };
}

/**
 * Pick logo asset + optional CSS filter for a background fill.
 * Mirrors canvas `BrandLogo` — use for Office headers on brand primary fields.
 */
export function resolveBrandLogoPresentation(
  brandKit: BrandKit,
  backgroundColor?: string,
  variantOverride?: "lockup" | "mark",
): BrandLogoPresentation {
  const ink = resolveInk(backgroundColor);

  if (brandKit.useOfficialLogo) {
    const kitVariant = isOfficialLogoVariant(brandKit.officialLogoVariant)
      ? brandKit.officialLogoVariant
      : "lockup";
    const variant: OfficialLogoVariant =
      variantOverride === "lockup" || variantOverride === "mark"
        ? variantOverride
        : kitVariant;
    return resolveOfficialPresentation(variant, ink);
  }

  const customSrc = brandKit.customLogoDataUrl?.trim();
  if (customSrc && !isUnionOpsLogoSrc(customSrc)) {
    const looksLikeWhiteMark =
      customSrc.includes("logo-mark-white") ||
      customSrc.includes("mark-on-dark") ||
      customSrc.includes("on-dark");
    const filter =
      ink !== null && !(ink && isLightInk(ink) && looksLikeWhiteMark)
        ? logoRasterFilter(ink)
        : undefined;
    return { src: customSrc, cssFilter: filter };
  }

  return { src: UNIONOPS_LOGOS.markInterlock };
}
