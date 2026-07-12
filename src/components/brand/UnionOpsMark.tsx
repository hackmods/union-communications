"use client";

import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/constants/brand";

/** Condensed U. */
const U_PATH =
  "M11 14h7v19c0 3.8 2.5 6.2 6 6.2s6-2.4 6-6.2V14h7v19c0 8-5.4 13.5-13 13.5S11 41 11 33V14z";

const sizePx = {
  sm: 32,
  md: 48,
  lg: 96,
} as const;

interface UnionOpsMarkProps {
  primaryColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Invert: white tile + brand-coloured UO (for dark / brand backgrounds) */
  onDark?: boolean;
  title?: string;
}

/** Inline UnionOps UO mark — square fill tracks Brand Kit primary. */
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
      <circle
        cx={47}
        cy={32}
        r={11.25}
        fill="none"
        stroke={glyph}
        strokeWidth={7.5}
      />
    </svg>
  );
}
