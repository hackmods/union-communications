import type { CSSProperties } from "react";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import { getGrainTileDataUrl } from "@/lib/utils/canvas-grain";
import { hexToRgba } from "@/lib/utils/contrast";

export interface CanvasSurfaceColors {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Base background style for a capture root (inline hex/rgba only).
 * Grain is applied via {@link CanvasGrainOverlay}, not here —
 * background-image stacking can fight soft-gradient + accent-band.
 */
export function canvasSurfaceStyle(
  tokens: CanvasTokens,
  colours: CanvasSurfaceColors,
): CSSProperties {
  const { primary, secondary, accent } = colours;

  switch (tokens.surface) {
    case "soft-gradient":
      return {
        backgroundColor: primary,
        backgroundImage: `linear-gradient(160deg, ${primary} 0%, ${secondary} 100%)`,
      };
    case "accent-band":
      return {
        backgroundColor: primary,
        backgroundImage: `linear-gradient(180deg, ${accent} 0%, ${accent} 12px, ${primary} 12px, ${primary} 100%)`,
      };
    case "grain":
    case "duotone":
    case "flat":
    default:
      return { backgroundColor: primary };
  }
}

/** Absolute grain overlay — PNG tile + soft-light (survives html-to-image). */
export function grainOverlayStyle(opacity: number): CSSProperties | null {
  if (opacity <= 0) return null;
  const tile = getGrainTileDataUrl();
  if (!tile) return null;
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage: `url(${tile})`,
    backgroundRepeat: "repeat",
    backgroundSize: "64px 64px",
    mixBlendMode: "soft-light",
    opacity,
    zIndex: 1,
  };
}

/** Duotone multiply/screen layers for photo pipelines (capture-safe). */
export function duotoneOverlayStyles(
  shadowColor: string,
  highlightColor: string,
  highlightOpacity = 0.7,
): { multiply: CSSProperties; screen: CSSProperties } {
  return {
    multiply: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundColor: shadowColor,
      mixBlendMode: "multiply",
      zIndex: 1,
    },
    screen: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundColor: highlightColor,
      mixBlendMode: "screen",
      opacity: highlightOpacity,
      zIndex: 2,
    },
  };
}

/** Soft fill variant when soft-gradient is wanted but secondary equals primary. */
export function softGradientOrFlat(
  primary: string,
  secondary: string,
): CSSProperties {
  if (secondary.toUpperCase() === primary.toUpperCase()) {
    return { backgroundColor: primary };
  }
  const mid = hexToRgba(secondary, 0.85) ?? secondary;
  return {
    backgroundColor: primary,
    backgroundImage: `linear-gradient(160deg, ${primary} 0%, ${mid} 100%)`,
  };
}
