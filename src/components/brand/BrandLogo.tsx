"use client";

import Image from "next/image";
import { useBrandStore } from "@/store/brand-store";
import {
  OFFICIAL_LOGOS,
  isOfficialLogoVariant,
  isSelectableOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

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

const textSizeClass = {
  sm: "h-8 w-8 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-24 w-24 text-2xl",
} as const;

function resolveOfficialSrc(
  variant: OfficialLogoVariant,
  onDark: boolean,
): { src: string; size: "lockup" | "mark"; isSvg: boolean } {
  // Non-selectable variants stay in storage for re-enable; display falls back to mark
  const effective: OfficialLogoVariant = isSelectableOfficialLogoVariant(
    variant,
  )
    ? variant
    : "mark";

  if (effective === "lockup") {
    return { src: OFFICIAL_LOGOS.lockup.src, size: "lockup", isSvg: false };
  }
  if (effective === "slitBlue") {
    return { src: OFFICIAL_LOGOS.slitBlue.src, size: "mark", isSvg: true };
  }
  if (effective === "slitWhite") {
    return { src: OFFICIAL_LOGOS.slitWhite.src, size: "mark", isSvg: true };
  }
  // mark — swap to white on dark backgrounds
  const src = onDark ? OFFICIAL_LOGOS.mark.srcOnDark : OFFICIAL_LOGOS.mark.src;
  return { src, size: "mark", isSvg: false };
}

export function BrandLogo({ size = "sm", className, onDark = false }: BrandLogoProps) {
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);
  const mark = (brandKit.logoText?.trim() || "LU").slice(0, 4);

  // First visit / before hydrate: keep the compact LU mark
  if (!hydrated) {
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded bg-opseu-blue font-bold text-white",
          textSizeClass[size],
          className,
        )}
        aria-hidden
      >
        LU
      </span>
    );
  }

  if (brandKit.useOfficialLogo) {
    const variant = isOfficialLogoVariant(brandKit.officialLogoVariant)
      ? brandKit.officialLogoVariant
      : "lockup";
    const resolved = resolveOfficialSrc(variant, onDark);
    const dims = resolved.size === "lockup" ? lockupSize[size] : markSize[size];

    if (resolved.isSvg) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- bundled SVG logos
        <img
          src={resolved.src}
          alt=""
          width={dims.width}
          height={dims.height}
          className={cn("object-contain", className)}
        />
      );
    }

    return (
      <Image
        src={resolved.src}
        alt=""
        width={dims.width}
        height={dims.height}
        className={cn("object-contain", className)}
      />
    );
  }

  if (brandKit.customLogoDataUrl) {
    const { width, height } = markSize[size];
    return (
      <Image
        src={brandKit.customLogoDataUrl}
        alt=""
        width={width}
        height={height}
        unoptimized
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded bg-opseu-blue font-bold text-white",
        textSizeClass[size],
        className,
      )}
      aria-hidden
    >
      {mark}
    </span>
  );
}
