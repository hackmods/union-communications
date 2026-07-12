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

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Prefer white mark when rendering on dark / brand-coloured backgrounds */
  onDark?: boolean;
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

function resolveOfficialSrc(
  variant: OfficialLogoVariant,
  onDark: boolean,
): { src: string; size: "lockup" | "mark" } {
  const effective: OfficialLogoVariant = isSelectableOfficialLogoVariant(
    variant,
  )
    ? variant
    : "mark";

  if (effective === "lockup") {
    return { src: OFFICIAL_LOGOS.lockup.src, size: "lockup" };
  }
  if (effective === "slitBlue") {
    return { src: OFFICIAL_LOGOS.slitBlue.src, size: "mark" };
  }
  if (effective === "slitWhite") {
    return { src: OFFICIAL_LOGOS.slitWhite.src, size: "mark" };
  }
  const src = onDark ? OFFICIAL_LOGOS.mark.srcOnDark : OFFICIAL_LOGOS.mark.src;
  return { src, size: "mark" };
}

export function BrandLogo({ size = "sm", className, onDark = false }: BrandLogoProps) {
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);
  const primaryColor = brandKit.primaryColor || BRAND_COLORS.primary;
  const secondaryColor = brandKit.secondaryColor || BRAND_COLORS.secondary;
  const dims = markSize[size];

  // Platform interlocking PNG — BrandLogo / UnionOpsMark masks + tints it
  const platformMark = (
    <UnionOpsMark
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      size={size}
      className={className}
      onDark={onDark}
    />
  );

  if (!hydrated) {
    return platformMark;
  }

  if (brandKit.useOfficialLogo) {
    const variant = isOfficialLogoVariant(brandKit.officialLogoVariant)
      ? brandKit.officialLogoVariant
      : "lockup";
    const resolved = resolveOfficialSrc(variant, onDark);
    const officialDims =
      resolved.size === "lockup" ? lockupSize[size] : markSize[size];

    return (
      <SafeLogoImage
        src={resolved.src}
        width={officialDims.width}
        height={officialDims.height}
        className={className}
        onDark={onDark}
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

    return (
      <SafeLogoImage
        src={customSrc}
        width={customDims.width}
        height={customDims.height}
        className={className}
        onDark={onDark}
      />
    );
  }

  return platformMark;
}
