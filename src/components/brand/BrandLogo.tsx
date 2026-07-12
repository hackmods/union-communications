"use client";

import Image from "next/image";
import { useBrandStore } from "@/store/brand-store";
import {
  OFFICIAL_LOGOS,
  isOfficialLogoVariant,
  isSelectableOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
import { UNIONOPS_LOGOS } from "@/lib/constants/unionPresets";
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

function isSvgSrc(src: string): boolean {
  return (
    src.endsWith(".svg") ||
    src.startsWith("data:image/svg") ||
    src.includes("image/svg")
  );
}

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
  // mark - swap to white on dark backgrounds
  const src = onDark ? OFFICIAL_LOGOS.mark.srcOnDark : OFFICIAL_LOGOS.mark.src;
  return { src, size: "mark", isSvg: false };
}

function LogoImage({
  src,
  width,
  height,
  className,
}: {
  src: string;
  width: number;
  height: number;
  className?: string;
}) {
  if (isSvgSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- SVG marks / wordmarks
      <img
        src={src}
        alt=""
        width={width}
        height={height}
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      unoptimized={src.startsWith("data:")}
      className={cn("object-contain", className)}
    />
  );
}

export function BrandLogo({ size = "sm", className, onDark = false }: BrandLogoProps) {
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);
  const dims = markSize[size];

  // First visit / before hydrate: UnionOps platform mark
  if (!hydrated) {
    return (
      <LogoImage
        src={onDark ? UNIONOPS_LOGOS.markOnDark : UNIONOPS_LOGOS.mark}
        width={dims.width}
        height={dims.height}
        className={className}
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
      <LogoImage
        src={resolved.src}
        width={officialDims.width}
        height={officialDims.height}
        className={className}
      />
    );
  }

  if (brandKit.customLogoDataUrl?.trim()) {
    let src = brandKit.customLogoDataUrl.trim();
    // Prefer on-dark variant for UnionOps / known mark paths when available
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
      <LogoImage
        src={src}
        width={customDims.width}
        height={customDims.height}
        className={className}
      />
    );
  }

  const mark = (brandKit.logoText?.trim() || "UO").slice(0, 4);
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded bg-opseu-blue font-bold text-white",
        size === "sm" && "h-8 w-8 text-sm",
        size === "md" && "h-12 w-12 text-base",
        size === "lg" && "h-24 w-24 text-2xl",
        className,
      )}
      aria-hidden
    >
      {mark}
    </span>
  );
}
