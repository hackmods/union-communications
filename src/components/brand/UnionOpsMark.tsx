"use client";

import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/constants/brand";
import {
  UNIONOPS_MARK_VIEWBOX,
  UNIONOPS_O,
  UNIONOPS_U_OPACITY,
  UNIONOPS_U_PATH,
  UNIONOPS_U_STROKE_WIDTH,
} from "@/lib/brand/unionops-mark-geometry";

const sizePx = {
  sm: 32,
  md: 48,
  lg: 96,
} as const;

interface UnionOpsMarkProps {
  primaryColor?: string;
  /** Graphics accent — colours the interlocking u (and plated glyphs). */
  secondaryColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Flat two-tone mark for dark / brand-coloured backgrounds (no plate). */
  onDark?: boolean;
  title?: string;
}

/**
 * Inline UnionOps interlocking u+o mark.
 * Primary → o; graphics accent (secondary) → u.
 * Light chrome uses a primary plate so a light accent stays legible.
 */
export function UnionOpsMark({
  primaryColor = BRAND_COLORS.primary,
  secondaryColor = BRAND_COLORS.secondary,
  size = "sm",
  className,
  onDark = false,
  title = "UnionOps",
}: UnionOpsMarkProps) {
  const px = sizePx[size];
  const uColor = secondaryColor;
  const oColor = onDark ? primaryColor : secondaryColor;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={UNIONOPS_MARK_VIEWBOX}
      width={px}
      height={px}
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      {!onDark ? (
        <rect width="64" height="64" rx="14" fill={primaryColor} />
      ) : null}
      <circle
        cx={UNIONOPS_O.cx}
        cy={UNIONOPS_O.cy}
        r={UNIONOPS_O.r}
        fill="none"
        stroke={oColor}
        strokeWidth={UNIONOPS_O.strokeWidth}
      />
      <path
        d={UNIONOPS_U_PATH}
        fill="none"
        stroke={uColor}
        strokeWidth={UNIONOPS_U_STROKE_WIDTH}
        strokeLinecap="butt"
        strokeLinejoin="round"
        opacity={UNIONOPS_U_OPACITY}
      />
    </svg>
  );
}
