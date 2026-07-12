"use client";

import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/constants/brand";

/** Twin solidarity arcs + center bridge (stroke paths — crisp at any size). */
const ARC_LEFT = "M26.5 15A17 17 0 0 0 26.5 49";
const ARC_RIGHT = "M37.5 15A17 17 0 0 1 37.5 49";
const BRIDGE = "M23 32h18";

const sizePx = {
  sm: 32,
  md: 48,
  lg: 96,
} as const;

interface UnionOpsMarkProps {
  primaryColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Invert: white tile + brand-coloured mark (for dark / brand backgrounds) */
  onDark?: boolean;
  title?: string;
}

/** Inline UnionOps mark — square fill tracks Brand Kit primary. */
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
      <g
        fill="none"
        stroke={glyph}
        strokeWidth={6.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ARC_LEFT} />
        <path d={ARC_RIGHT} />
        <path d={BRIDGE} />
      </g>
    </svg>
  );
}
