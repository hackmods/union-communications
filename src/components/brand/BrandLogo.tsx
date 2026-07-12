"use client";

import { useBrandStore } from "@/store/brand-store";
import {
  OFFICIAL_LOGOS,
  isOfficialLogoVariant,
  isSelectableOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
import { UNIONOPS_LOGOS } from "@/lib/constants/unionPresets";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";

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
  // Non-selectable variants stay in storage for re-enable; display falls back to mark
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
  const dims = markSize[size];

  // First visit / before hydrate: UnionOps platform mark
  if (!hydrated) {
    return (
      <SafeLogoImage
        src={onDark ? UNIONOPS_LOGOS.markOnDark : UNIONOPS_LOGOS.mark}
        width={dims.width}
        height={dims.height}
        className={className}
        onDark={onDark}
      />
    );
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
    let src = customSrc;
    if (
      onDark &&
      (src === UNIONOPS_LOGOS.mark || src === UNIONOPS_LOGOS.lockup)
    ) {
      src = UNIONOPS_LOGOS.markOnDark;
    }
    const isLockup =
      src.includes("logo-lockup") ||
      src.includes("logo-primary") ||
      (src.endsWith("/logo.svg") && !src.includes("logo-mark"));
    const customDims = isLockup ? lockupSize[size] : markSize[size];

    return (
      <SafeLogoImage
        src={src}
        width={customDims.width}
        height={customDims.height}
        className={className}
        onDark={onDark}
      />
    );
  }

  // No logo configured — UnionOps, not a broken image
  return (
    <SafeLogoImage
      src={onDark ? UNIONOPS_LOGOS.markOnDark : UNIONOPS_LOGOS.mark}
      width={dims.width}
      height={dims.height}
      className={className}
      onDark={onDark}
    />
  );
}

