"use client";

import Image from "next/image";
import { useBrandStore } from "@/store/brand-store";
import { DEFAULT_ASSET_PACK_PATH } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 96,
} as const;

export function BrandLogo({ size = "sm", className }: BrandLogoProps) {
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);
  const px = sizeMap[size];

  if (!hydrated || brandKit.useOfficialLogo) {
    return (
      <Image
        src={`${DEFAULT_ASSET_PACK_PATH}logo-primary.svg`}
        alt=""
        width={px}
        height={px}
        className={className}
      />
    );
  }

  if (brandKit.customLogoDataUrl) {
    return (
      <Image
        src={brandKit.customLogoDataUrl}
        alt=""
        width={px}
        height={px}
        unoptimized
        className={cn("object-contain", className)}
      />
    );
  }

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
      LU
    </span>
  );
}
