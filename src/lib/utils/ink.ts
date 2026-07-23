import { BRAND_COLORS } from "@/lib/constants/brand";
import {
  contrastRatio,
  hexToRgba,
  meetsWcagAA,
} from "@/lib/utils/contrast";

/** Solid ink tones for logos/titles on brand-coloured canvases */
export type InkTone = typeof BRAND_COLORS.white | typeof BRAND_COLORS.black;

export const INK_WHITE = BRAND_COLORS.white;
export const INK_BLACK = BRAND_COLORS.black;

/**
 * Pick white or black for best contrast against a background.
 * Ties (or invalid hex) prefer white so dark brand fields stay readable.
 */
export function pickContrastingInk(background: string): InkTone {
  const whiteRatio = contrastRatio(INK_WHITE, background) ?? 0;
  const blackRatio = contrastRatio(INK_BLACK, background) ?? 0;
  return whiteRatio >= blackRatio ? INK_WHITE : INK_BLACK;
}

/** True when ink resolves to white (light mark / light text). */
export function isLightInk(ink: InkTone): boolean {
  return ink === INK_WHITE;
}

/**
 * Export-safe rgba from an ink tone + alpha.
 * Falls back to opaque ink if hex parsing fails.
 */
export function inkWithAlpha(ink: InkTone, alpha: number): string {
  return hexToRgba(ink, alpha) ?? ink;
}

/**
 * CSS filter to force a raster logo to solid white or black.
 * Prefer over mask-image — filters survive html-to-image capture.
 */
export function logoRasterFilter(ink: InkTone): string {
  return isLightInk(ink)
    ? "brightness(0) invert(1)"
    : "brightness(0)";
}

/**
 * Whether two colours clash enough that a logo/title needs ink override.
 * Default minRatio 3 ≈ WCAG AA large / decorative mark threshold.
 */
export function coloursClash(
  a: string,
  b: string,
  minRatio = 3,
): boolean {
  const ratio = contrastRatio(a, b);
  if (ratio === null) return false;
  return ratio < minRatio;
}

/** Brand Kit / ThemePicker palette fields checked for accessibility risk. */
export type BrandPalette = {
  primary: string;
  secondary: string;
  accent?: string;
};

export type BrandContrastIssue =
  | "primaryCanvasInk"
  | "secondaryCanvasInk"
  | "accentCanvasInk"
  | "primarySecondaryClash";

/**
 * Evaluate whether a Brand Kit palette will be hard to read on canvases.
 * Uses auto ink (`pickContrastingInk`) for WCAG AA against each field as a
 * background, plus `coloursClash` when primary sits with secondary.
 * Accent is checked as a canvas background only — it is often a darkened
 * primary by design, so primary/accent clash is not treated as a risk.
 */
export function evaluateBrandPaletteContrast(
  palette: BrandPalette,
): { ok: boolean; issues: BrandContrastIssue[] } {
  const issues: BrandContrastIssue[] = [];
  const { primary, secondary, accent } = palette;

  if (!meetsWcagAA(pickContrastingInk(primary), primary)) {
    issues.push("primaryCanvasInk");
  }
  if (!meetsWcagAA(pickContrastingInk(secondary), secondary)) {
    issues.push("secondaryCanvasInk");
  }
  if (coloursClash(primary, secondary)) {
    issues.push("primarySecondaryClash");
  }
  if (accent && !meetsWcagAA(pickContrastingInk(accent), accent)) {
    issues.push("accentCanvasInk");
  }

  return { ok: issues.length === 0, issues };
}

/** True when Brand Kit colours fail accessibility checks used by tools. */
export function brandPaletteHasContrastRisk(palette: BrandPalette): boolean {
  return !evaluateBrandPaletteContrast(palette).ok;
}
