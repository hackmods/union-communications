"use client";

import { useBrandStore } from "@/store/brand-store";
import { BRAND_COLORS, isOfficialLogoVariant } from "@/lib/constants/brand";
import { isUnionOpsLogoSrc } from "@/lib/constants/unionPresets";
import { resolveBrandLogoPresentation } from "@/lib/brand/resolve-logo-presentation";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import {
  INK_WHITE,
  isLightInk,
  pickContrastingInk,
  type InkTone,
} from "@/lib/utils/ink";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  alt?: string;
  onDark?: boolean;
  backgroundColor?: string;
  variantOverride?: "lockup" | "mark";
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

import type { BrandKit } from "@/types/entities";

type LogoDimensions =
  | (typeof lockupSize)[keyof typeof lockupSize]
  | (typeof markSize)[keyof typeof markSize];

function logoDims(
  brandKit: BrandKit,
  size: keyof typeof markSize,
  variantOverride?: "lockup" | "mark",
): LogoDimensions {
  const customSrc = brandKit.customLogoDataUrl?.trim();
  if (customSrc && !brandKit.useOfficialLogo) {
    const pathLooksLockup =
      customSrc.includes("logo-lockup") ||
      customSrc.includes("logo-primary") ||
      (customSrc.endsWith("/logo.svg") && !customSrc.includes("logo-mark"));
    const preferLockup =
      variantOverride === "lockup"
        ? true
        : variantOverride === "mark"
          ? false
          : pathLooksLockup;
    return preferLockup ? lockupSize[size] : markSize[size];
  }

  const kitVariant = isOfficialLogoVariant(brandKit.officialLogoVariant)
    ? brandKit.officialLogoVariant
    : "lockup";
  const variant =
    variantOverride === "lockup" || variantOverride === "mark"
      ? variantOverride
      : kitVariant;
  return variant === "lockup" ? lockupSize[size] : markSize[size];
}

export function BrandLogo({
  size = "sm",
  className,
  alt = "",
  onDark = false,
  backgroundColor,
  variantOverride,
}: BrandLogoProps) {
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);
  const primaryColor = brandKit.primaryColor || BRAND_COLORS.primary;
  const secondaryColor = brandKit.secondaryColor || BRAND_COLORS.secondary;
  const ink = resolveInk(backgroundColor, onDark);

  const platformMark = (
    <UnionOpsMark
      primaryColor={hydrated ? primaryColor : "var(--opseu-blue)"}
      secondaryColor={hydrated ? secondaryColor : "var(--brand-secondary)"}
      size={size}
      className={className}
      ink={ink ?? undefined}
      onDark={onDark && !backgroundColor}
      title={alt || "UnionOps"}
    />
  );

  if (!hydrated) {
    return platformMark;
  }

  const customSrc = brandKit.customLogoDataUrl?.trim();
  if (customSrc && isUnionOpsLogoSrc(customSrc)) {
    return platformMark;
  }

  if (brandKit.useOfficialLogo || customSrc) {
    const { src, cssFilter } = resolveBrandLogoPresentation(
      brandKit,
      backgroundColor,
      variantOverride,
    );
    const officialDims = logoDims(brandKit, size, variantOverride);

    return (
      <SafeLogoImage
        src={src}
        alt={alt}
        width={officialDims.width}
        height={officialDims.height}
        className={className}
        onDark={ink ? isLightInk(ink) : onDark}
        style={cssFilter ? { filter: cssFilter } : undefined}
      />
    );
  }

  return platformMark;
}
