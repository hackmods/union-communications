import type { CSSProperties } from "react";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import { getGrainTileDataUrl } from "@/lib/utils/canvas-grain";
import { blendHex, contrastRatio, hexToRgba } from "@/lib/utils/contrast";
import {
  coloursClash,
  INK_WHITE,
  isLightInk,
  pickContrastingInk,
} from "@/lib/utils/ink";

export interface CanvasSurfaceColors {
  primary: string;
  secondary: string;
  accent: string;
}

function isNearPaperWhite(color: string): boolean {
  const ratio = contrastRatio(color, INK_WHITE);
  return ratio !== null && ratio < 1.2;
}

/**
 * Soft-gradient end stop that keeps field ink readable.
 * Full secondary white under light ink (OPSEU / CAAT-S) washes headlines out —
 * deepen slightly instead of lifting toward paper so type stays crisp.
 */
export function softGradientEndColor(
  primary: string,
  secondary: string,
): string {
  const ink = pickContrastingInk(primary);
  if (isLightInk(ink) && isNearPaperWhite(secondary)) {
    // Soft depth without bleaching the plate under white type
    return blendHex("#000000", primary, 0.12);
  }
  if (coloursClash(ink, secondary, 3)) {
    return blendHex(secondary, primary, 0.35);
  }
  return secondary;
}

/**
 * Same-hue field fill for full-bleed social layouts.
 * Avoids primary→white / primary→accent washes that muddy midtones and look
 * trashy on volunteer graphics — accent belongs on badges and stripes, not the plate.
 */
export function brandFieldEndColor(primary: string, deepen = 0.18): string {
  return blendHex("#000000", primary, Math.min(0.35, Math.max(0.08, deepen)));
}

export function brandFieldFillStyle(
  primary: string,
  deepen = 0.18,
): CSSProperties {
  const end = brandFieldEndColor(primary, deepen);
  return {
    backgroundColor: primary,
    backgroundImage: `linear-gradient(160deg, ${primary} 0%, ${end} 100%)`,
  };
}

/**
 * Short bottom lift under bottom-anchored copy — keeps type readable without
 * greying out most of the plate the way a tall black wash does.
 */
export function brandFieldBottomLiftStyle(
  strength: "solidarity" | "spotlight" = "solidarity",
): CSSProperties {
  if (strength === "spotlight") {
    return {
      backgroundImage:
        "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.4) 32%, transparent 52%)",
    };
  }
  return {
    backgroundImage:
      "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 30%, transparent 48%)",
  };
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
    case "soft-gradient": {
      const end = softGradientEndColor(primary, secondary);
      return {
        backgroundColor: primary,
        backgroundImage: `linear-gradient(160deg, ${primary} 0%, ${end} 100%)`,
      };
    }
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

/** Duotone multiply/screen layers for photo pipelines (preview-only fallback).
 * Prefer {@link composeDuotonePhotoDataUrl} / `CanvasDuotonePhoto` baked rasters
 * for anything that will go through html-to-image. */
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

/** Explicit soft gradient for wallet cards (QR / Action) — same end-stop as `soft-gradient` surface. */
export function softGradientFillStyle(
  primary: string,
  secondary: string,
): CSSProperties {
  const end = softGradientEndColor(primary, secondary);
  return {
    backgroundColor: primary,
    backgroundImage: `linear-gradient(160deg, ${primary} 0%, ${end} 100%)`,
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
  const end = softGradientEndColor(primary, secondary);
  const mid = hexToRgba(end, 0.85) ?? end;
  return {
    backgroundColor: primary,
    backgroundImage: `linear-gradient(160deg, ${primary} 0%, ${mid} 100%)`,
  };
}
