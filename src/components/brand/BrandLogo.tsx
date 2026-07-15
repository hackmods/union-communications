"use client";

import { useBrandStore } from "@/store/brand-store";
import {
  OFFICIAL_LOGOS,
  BRAND_COLORS,
  isOfficialLogoVariant,
  isSelectableOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
import {
  isUnionOpsLogoSrc,
} from "@/lib/constants/unionPresets";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import {
  INK_WHITE,
  isLightInk,
  logoRasterFilter,
  pickContrastingInk,
  type InkTone,
} from "@/lib/utils/ink";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * Force light (white) ink. Prefer `backgroundColor` so ink auto-swaps
   * to black on pale fields.
   */
  onDark?: boolean;
  /** Canvas fill hex — drives auto white/black ink for mark + raster logos */
  backgroundColor?: string;
}

const lockupSize = {
  sm: { width: 80, height: 32 },
  md: { width: 120, height: 48 },
  lg: { width: 200, height: 80 },
} as const;

const markSize = {
  sm: { width: 32, height: 32 },
  md: { width: 48, height: 48 },
  lg: { width: 96, height: 96 },
} as const;

function resolveInk(
  backgroundColor: string | undefined,
  onDark: boolean,
): InkTone | null {
  if (backgroundColor) return pickContrastingInk(backgroundColor);
  if (onDark) return INK_WHITE;
  return null;
}

function resolveOfficialSrc(
  variant: OfficialLogoVariant,
  ink: InkTone | null,
): { src: string; size: "lockup" | "mark"; useFilter: boolean } {
  const effective: OfficialLogoVariant = isSelectableOfficialLogoVariant(
    variant,
  )
    ? variant
    : "mark";

  if (effective === "lockup") {
    return {
      src: OFFICIAL_LOGOS.lockup.src,
      size: "lockup",
      useFilter: ink !== null,
    };
  }
  if (effective === "slitBlue") {
    return {
      src: OFFICIAL_LOGOS.slitBlue.src,
      size: "mark",
      useFilter: ink !== null,
    };
  }
  if (effective === "slitWhite") {
    return {
      src: OFFICIAL_LOGOS.slitWhite.src,
      size: "mark",
      // Already white — only filter when forcing black
      useFilter: ink !== null && !isLightInk(ink),
    };
  }

  if (ink && isLightInk(ink)) {
    return {
      src: OFFICIAL_LOGOS.mark.srcOnDark,
      size: "mark",
      useFilter: false,
    };
  }
  return {
    src: OFFICIAL_LOGOS.mark.src,
    size: "mark",
    useFilter: ink !== null,
  };
}

export function BrandLogo({
  size = "sm",
  className,
  onDark = false,
  backgroundColor,
}: BrandLogoProps) {
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);
  const primaryColor = brandKit.primaryColor || BRAND_COLORS.primary;
  const secondaryColor = brandKit.secondaryColor || BRAND_COLORS.secondary;
  const dims = markSize[size];
  const ink = resolveInk(backgroundColor, onDark);
  const rasterFilter = ink ? logoRasterFilter(ink) : undefined;

  // Platform interlocking SVG — BrandLogo / UnionOpsMark tints via fill
  const platformMark = (
    <UnionOpsMark
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      size={size}
      className={className}
      ink={ink ?? undefined}
      onDark={onDark && !backgroundColor}
    />
  );

  if (!hydrated) {
    return platformMark;
  }

  if (brandKit.useOfficialLogo) {
    const variant = isOfficialLogoVariant(brandKit.officialLogoVariant)
      ? brandKit.officialLogoVariant
      : "lockup";
    const resolved = resolveOfficialSrc(variant, ink);
    const officialDims =
      resolved.size === "lockup" ? lockupSize[size] : markSize[size];

    return (
      <SafeLogoImage
        src={resolved.src}
        width={officialDims.width}
        height={officialDims.height}
        className={className}
        onDark={ink ? isLightInk(ink) : onDark}
        style={
          resolved.useFilter && rasterFilter
            ? { filter: rasterFilter }
            : undefined
        }
      />
    );
  }

  const customSrc = brandKit.customLogoDataUrl?.trim();
  if (customSrc) {
    if (isUnionOpsLogoSrc(customSrc)) {
      return platformMark;
    }

    const isLockup =
      customSrc.includes("logo-lockup") ||
      customSrc.includes("logo-primary") ||
      (customSrc.endsWith("/logo.svg") && !customSrc.includes("logo-mark"));
    const customDims = isLockup ? lockupSize[size] : dims;
    const looksLikeWhiteMark =
      customSrc.includes("logo-mark-white") ||
      customSrc.includes("mark-on-dark") ||
      customSrc.includes("on-dark");
    const useFilter =
      ink !== null && !(ink && isLightInk(ink) && looksLikeWhiteMark);

    return (
      <SafeLogoImage
        src={customSrc}
        width={customDims.width}
        height={customDims.height}
        className={className}
        onDark={ink ? isLightInk(ink) : onDark}
        style={useFilter && rasterFilter ? { filter: rasterFilter } : undefined}
      />
    );
  }

  return platformMark;
}
