"use client";

import Image from "next/image";
import { useBrandStore } from "@/store/brand-store";
import { OFFICIAL_LOGOS } from "@/lib/constants/brand";
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
    const variant = brandKit.officialLogoVariant === "mark" ? "mark" : "lockup";
    if (variant === "mark") {
      const { width, height } = markSize[size];
      const src = onDark ? OFFICIAL_LOGOS.mark.srcOnDark : OFFICIAL_LOGOS.mark.src;
      return (
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          className={cn("object-contain", className)}
        />
      );
    }
    const { width, height } = lockupSize[size];
    return (
      <Image
        src={OFFICIAL_LOGOS.lockup.src}
        alt=""
        width={width}
        height={height}
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
