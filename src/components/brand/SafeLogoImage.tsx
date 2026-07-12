"use client";

import { useState } from "react";
import { UNIONOPS_LOGOS, unionOpsLogoSrc } from "@/lib/constants/unionPresets";
import { cn } from "@/lib/utils";

interface SafeLogoImageProps {
  src: string;
  width: number;
  height: number;
  className?: string;
  /** Prefer on-dark UnionOps mark when falling back */
  onDark?: boolean;
  alt?: string;
}

/**
 * Renders a logo and falls back to UnionOps if the src is empty or fails to load.
 * Uses <img> for all public/asset paths so a missing file never crashes Next/Image.
 */
export function SafeLogoImage({
  src,
  width,
  height,
  className,
  onDark = false,
  alt = "",
}: SafeLogoImageProps) {
  const fallback = unionOpsLogoSrc(onDark);
  const requested = src.trim() || fallback;
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const current = failedFor === requested ? fallback : requested;
  const isUnionOps =
    current === UNIONOPS_LOGOS.mark ||
    current === UNIONOPS_LOGOS.markOnDark ||
    current === UNIONOPS_LOGOS.lockup ||
    current === UNIONOPS_LOGOS.markInterlock;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset logos need load-error fallback
    <img
      src={current}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-contain", className)}
      onError={() => {
        if (requested !== fallback) {
          setFailedFor(requested);
        }
      }}
      data-fallback={isUnionOps ? "unionops" : undefined}
    />
  );
}
