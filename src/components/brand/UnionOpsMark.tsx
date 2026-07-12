"use client";

import { cn } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { UNIONOPS_LOGOS } from "@/lib/constants/unionPresets";

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
 * UnionOps interlocking u+o mark — PNG base with CSS-mask colour overlay.
 * Asset: `UNIONOPS_LOGOS.markInterlock` (kept alongside the SVG set).
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
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-[22%]",
        className,
      )}
      style={{ width: px, height: px, backgroundColor: plate }}
    >
      <span
        aria-hidden
        className="block size-full"
        style={{
          backgroundColor: glyph,
          WebkitMaskImage: `url(${UNIONOPS_LOGOS.markInterlock})`,
          maskImage: `url(${UNIONOPS_LOGOS.markInterlock})`,
          WebkitMaskSize: "78%",
          maskSize: "78%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </span>
  );
}
