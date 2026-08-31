"use client";

import { useMemo } from "react";
import { useBrandStore } from "@/store/brand-store";
import { readBrandKitLogoSnapshot } from "@/lib/brand/read-logo-snapshot";
import { BRAND_COLORS, isOfficialLogoVariant } from "@/lib/constants/brand";
import { isUnionOpsLogoSrc } from "@/lib/constants/unionPresets";
import {
  resolveBrandLogoPresentation,
  type LogoSafePlate,
} from "@/lib/brand/resolve-logo-presentation";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import {
  INK_WHITE,
  isLightInk,
  pickContrastingInk,
  type InkTone,
} from "@/lib/utils/ink";
import { cn } from "@/lib/utils";
import type { BrandKit } from "@/types/entities";
import type { CSSProperties } from "react";

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

function LogoWithOptionalPlate({
  src,
  width,
  height,
  alt,
  className,
  onDark,
  style,
  plate,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  onDark?: boolean;
  style?: CSSProperties;
  plate?: LogoSafePlate;
}) {
  const image = (
    <SafeLogoImage
      key={src}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={plate ? undefined : className}
      onDark={onDark}
      style={style}
    />
  );

  if (!plate) return image;

  return (
    <div
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{
        backgroundColor: plate.backgroundColor,
        padding: plate.paddingPx,
        borderRadius: plate.radiusPx,
      }}
    >
      {image}
    </div>
  );
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
  const logoSnapshot = useMemo(
    () => (hydrated ? null : readBrandKitLogoSnapshot()),
    [hydrated],
  );
  const effectiveKit = hydrated
    ? brandKit
    : logoSnapshot
      ? { ...brandKit, ...logoSnapshot }
      : brandKit;
  const chromeReady = hydrated || logoSnapshot !== null;
  const primaryColor = effectiveKit.primaryColor || BRAND_COLORS.primary;
  const secondaryColor = effectiveKit.secondaryColor || BRAND_COLORS.secondary;
  const ink = resolveInk(backgroundColor, onDark);

  const platformMark = (
    <UnionOpsMark
      primaryColor={chromeReady ? primaryColor : "var(--opseu-blue)"}
      secondaryColor={chromeReady ? secondaryColor : "var(--brand-secondary)"}
      size={size}
      className={className}
      ink={ink ?? undefined}
      onDark={onDark && !backgroundColor}
      title={alt || "UnionOps"}
    />
  );

  if (!chromeReady) {
    return platformMark;
  }

  // Official Look / pack logos win over a leftover UnionOps customLogoDataUrl
  // (DEFAULT_BRAND_KIT mark used to resurrect after localStorage round-trips).
  if (effectiveKit.useOfficialLogo) {
    const { src, cssFilter, plate } = resolveBrandLogoPresentation(
      effectiveKit,
      backgroundColor,
      variantOverride,
    );
    const officialDims = logoDims(effectiveKit, size, variantOverride);

    return (
      <LogoWithOptionalPlate
        src={src}
        alt={alt}
        width={officialDims.width}
        height={officialDims.height}
        className={className}
        onDark={ink ? isLightInk(ink) : onDark}
        style={cssFilter ? { filter: cssFilter } : undefined}
        plate={plate}
      />
    );
  }

  const customSrc = effectiveKit.customLogoDataUrl?.trim();
  if (customSrc && isUnionOpsLogoSrc(customSrc)) {
    return platformMark;
  }

  if (customSrc) {
    const { src, cssFilter, plate } = resolveBrandLogoPresentation(
      effectiveKit,
      backgroundColor,
      variantOverride,
    );
    const officialDims = logoDims(effectiveKit, size, variantOverride);

    return (
      <LogoWithOptionalPlate
        src={src}
        alt={alt}
        width={officialDims.width}
        height={officialDims.height}
        className={className}
        onDark={ink ? isLightInk(ink) : onDark}
        style={cssFilter ? { filter: cssFilter } : undefined}
        plate={plate}
      />
    );
  }

  return platformMark;
}
