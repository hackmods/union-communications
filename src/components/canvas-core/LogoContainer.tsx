"use client";

import type { CSSProperties, ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOGO_BOUNDS,
  MARK_BOUNDS,
  WIDE_LOCKUP_BOUNDS,
  type AssetBounds,
} from "./types";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";

export type LogoContainerProps = {
  backgroundColor: string;
  logoMode?: BoardLogoMode;
  /**
   * Explicit bounds. When omitted, resolves from logoMode / wideLockup.
   */
  bounds?: AssetBounds;
  /** Prefer when the lockup is a wide bilingual plate (CAAT faculty/support). */
  wideLockup?: boolean;
  className?: string;
  children?: ReactNode;
};

function resolveBounds(
  logoMode: BoardLogoMode,
  wideLockup: boolean,
  bounds?: AssetBounds,
): AssetBounds {
  if (bounds) return bounds;
  if (logoMode === "mark") return MARK_BOUNDS;
  if (wideLockup) return WIDE_LOCKUP_BOUNDS;
  return DEFAULT_LOGO_BOUNDS;
}

/**
 * Canvas-relative logo slot. Width is capped in cqw so proportion holds at
 * half-letter and tabloid (fixes the measured 81/58/44% drift).
 *
 * Must sit inside a CanvasWrapper export root that establishes the
 * `unionops-canvas` container — this component does NOT set container-type.
 */
export function LogoContainer({
  backgroundColor,
  logoMode = "lockup",
  bounds,
  wideLockup = false,
  className,
  children,
}: LogoContainerProps) {
  if (logoMode === "none") {
    return children ? <>{children}</> : null;
  }

  const resolved = resolveBounds(logoMode, wideLockup, bounds);
  const alignItems =
    resolved.align === "center"
      ? "center"
      : resolved.align === "end"
        ? "flex-end"
        : "flex-start";

  const slotStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems,
    // Parent-relative % — works without a container ancestor (CanvasBrandHeader
    // ships on tools that have not migrated to CanvasWrapper yet). Same
    // proportion as cqw when the parent is the canvas/content column.
    width: `min(100%, ${resolved.maxWidthCqw}%)`,
    maxWidth: "100%",
  };

  const logoClass =
    logoMode === "mark"
      ? "h-auto w-full max-h-24"
      : "h-auto w-full max-h-20";

  return (
    <div
      data-logo-container=""
      className={cn("relative shrink-0 overflow-hidden", className)}
      style={slotStyle}
    >
      <BrandLogo
        size={logoMode === "mark" ? "md" : "sm"}
        backgroundColor={backgroundColor}
        variantOverride={logoMode === "mark" ? "mark" : "lockup"}
        className={logoClass}
      />
      {children}
    </div>
  );
}
