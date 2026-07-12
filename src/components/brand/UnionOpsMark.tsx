"use client";

import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/constants/brand";

const sizePx = {
  sm: 32,
  md: 48,
  lg: 96,
} as const;

interface UnionOpsMarkProps {
  primaryColor?: string;
  /** Graphics accent — glyph colour on the primary plate (light chrome). */
  secondaryColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * Dark / brand backgrounds: white back plate + primary glyph.
   * Light chrome: primary plate + graphics-accent glyph.
   */
  onDark?: boolean;
  title?: string;
}

/**
 * UnionOps interlocking u+o mark — inline SVG so html-to-image PNG export
 * captures brand colours (CSS mask-image does not survive canvas rasterization).
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
  // Swap back to white when on dark / Brand Kit dark preview
  const plate = onDark ? "#FFFFFF" : primaryColor;
  const glyph = onDark ? primaryColor : secondaryColor;

  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={cn("inline-flex shrink-0 overflow-hidden rounded-[22%]", className)}
      style={{ width: px, height: px }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={px}
        height={px}
        aria-hidden
        className="block size-full"
      >
        <rect width="64" height="64" rx="14" fill={plate} />
        {/* O (behind) */}
        <circle
          cx="44"
          cy="34"
          r="14"
          fill="none"
          stroke={glyph}
          strokeWidth="10"
        />
        {/* U (overlap) */}
        <path
          d="M12 14v20a14 14 0 0 0 28 0V14"
          fill="none"
          stroke={glyph}
          strokeWidth="10"
          strokeLinecap="butt"
          strokeLinejoin="round"
          opacity="0.88"
        />
      </svg>
    </span>
  );
}
