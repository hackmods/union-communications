"use client";

import Image from "next/image";
import { useBrandStore } from "@/store/brand-store";
import { DEFAULT_ASSET_PACK_PATH } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Official OPSEU/SEFPO lockup is wide (~2.5:1), not square */
const sizeMap = {
  sm: { width: 80, height: 32 },
  md: { width: 120, height: 48 },
  lg: { width: 200, height: 80 },
} as const;

const textSizeClass = {
  sm: "h-8 w-8 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-24 w-24 text-2xl",
} as const;

export function BrandLogo({ size = "sm", className }: BrandLogoProps) {
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);
  const { width, height } = sizeMap[size];
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
    return (
      <Image
        src={`${DEFAULT_ASSET_PACK_PATH}logo-primary.png`}
        alt=""
        width={width}
        height={height}
        className={cn("object-contain", className)}
      />
    );
  }

  if (brandKit.customLogoDataUrl) {
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
