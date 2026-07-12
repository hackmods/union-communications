"use client";

import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/constants/brand";

/** Interlocking links — Solidarity / multi-union mark (single evenodd path). */
const LINK_PATH =
  "M24.5 12.5c-7.46 0-13.5 6.04-13.5 13.5v12c0 7.46 6.04 13.5 13.5 13.5h3.5v-7h-3.5c-3.58 0-6.5-2.92-6.5-6.5v-12c0-3.58 2.92-6.5 6.5-6.5h11c3.58 0 6.5 2.92 6.5 6.5v3.5h7V26c0-7.46-6.04-13.5-13.5-13.5h-11zM36 24.5c-3.58 0-6.5 2.92-6.5 6.5v3.5h-7V31c0-7.46 6.04-13.5 13.5-13.5h11c7.46 0 13.5 6.04 13.5 13.5v8c0 7.46-6.04 13.5-13.5 13.5h-11c-7.46 0-13.5-6.04-13.5-13.5v-3.5h7v3.5c0 3.58 2.92 6.5 6.5 6.5h11c3.58 0 6.5-2.92 6.5-6.5v-8c0-3.58-2.92-6.5-6.5-6.5H36z";

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
      <path fill={glyph} fillRule="evenodd" d={LINK_PATH} />
    </svg>
  );
}
