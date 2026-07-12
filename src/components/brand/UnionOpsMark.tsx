"use client";

import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/constants/brand";

const U_PATH =
  "M18 16c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v18.5c0 4.1 2.7 6.5 6 6.5s6-2.4 6-6.5V16c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v18.5c0 8.3-5.8 13.5-14 13.5s-14-5.2-14-13.5V16z";

const sizePx = {
  sm: 32,
  md: 48,
  lg: 96,
} as const;

interface UnionOpsMarkProps {
  primaryColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Invert: white tile + brand-coloured U (for dark / brand backgrounds) */
  onDark?: boolean;
  title?: string;
}

/** Inline UnionOps “U” mark — square fill tracks Brand Kit primary. */
export function UnionOpsMark({
  primaryColor = BRAND_COLORS.primary,
  size = "sm",
  className,
  onDark = false,
  title = "UnionOps",
}: UnionOpsMarkProps) {
  const px = sizePx[size];
  const tile = onDark ? "#FFFFFF" : primaryColor;
  const glyph = onDark ? primaryColor : "#FFFFFF";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={px}
      height={px}
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      <rect width="64" height="64" rx="14" fill={tile} />
      <path fill={glyph} d={U_PATH} />
    </svg>
  );
}
