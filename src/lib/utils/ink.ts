import { BRAND_COLORS } from "@/lib/constants/brand";
import {
  blendHex,
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
 * Prefers white when it meets large-text AA (≥3:1) so saturated brand
 * fields (e.g. CAAT-S coral) get light ink instead of vibrating black text.
 * Ties (or invalid hex) also prefer white.
 */
export function pickContrastingInk(background: string): InkTone {
  const whiteRatio = contrastRatio(INK_WHITE, background) ?? 0;
  const blackRatio = contrastRatio(INK_BLACK, background) ?? 0;
  // Brand canvases: light ink when it clears large-text AA, even if black
  // scores higher for normal text (coral/gold plates).
  if (whiteRatio >= 3) return INK_WHITE;
  return whiteRatio >= blackRatio ? INK_WHITE : INK_BLACK;
}

/**
 * Ink for type sitting across a multi-stop brand field (hero / soft washes).
 * Samples stops and mid-blends, then picks the tone with the better
 * worst-case contrast so white does not wash out over paper/gold mids.
 */
export function pickFieldInk(stops: readonly string[]): InkTone {
  if (stops.length === 0) return INK_WHITE;
  if (stops.length === 1) return pickContrastingInk(stops[0]!);

  const samples: string[] = [];
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i]!;
    samples.push(stop);
    if (i < stops.length - 1) {
      samples.push(blendHex(stops[i + 1]!, stop, 0.5));
    }
  }

  let whiteMin = Number.POSITIVE_INFINITY;
  let blackMin = Number.POSITIVE_INFINITY;
  for (const bg of samples) {
    whiteMin = Math.min(whiteMin, contrastRatio(INK_WHITE, bg) ?? 0);
    blackMin = Math.min(blackMin, contrastRatio(INK_BLACK, bg) ?? 0);
  }

  // Prefer white only when every sampled region still clears large-text AA.
  if (whiteMin >= 3 && whiteMin + 0.15 >= blackMin) return INK_WHITE;
  return whiteMin >= blackMin ? INK_WHITE : INK_BLACK;
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
 * Muted body/footer ink on a solid canvas background.
 * Bumps alpha toward opaque when the requested transparency fails WCAG AA
 * (e.g. white @ 0.85 on UnionOps orange #C2410C).
 */
export function mutedInkOnBackground(
  background: string,
  alpha = 0.85,
): string {
  const ink = pickContrastingInk(background);
  const start = Math.min(1, Math.max(0, alpha));
  for (let a = start; a <= 1.0001; a += 0.01) {
    const clamped = Math.min(1, a);
    const blended = blendHex(ink, background, clamped);
    if (meetsWcagAA(blended, background)) {
      return clamped >= 0.999 ? ink : inkWithAlpha(ink, clamped);
    }
  }
  return ink;
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

/** True when `color` is paper-white / near-white (exports look like a margin gap). */
function isNearPaperWhite(color: string): boolean {
  const ratio = contrastRatio(color, INK_WHITE);
  return ratio !== null && ratio < 1.2;
}

/**
 * Colour for a full-bleed edge accent strip on a primary canvas.
 * Prefers secondary when it reads as a deliberate accent; falls back to
 * primary when secondary clashes with the field or is paper-white on a
 * dark field (e.g. OPSEU secondary `#FFFFFF` → awkward white banner).
 */
export function canvasAccentStripColor(
  primary: string,
  secondary: string,
): string {
  if (coloursClash(primary, secondary)) return primary;
  if (isLightInk(pickContrastingInk(primary)) && isNearPaperWhite(secondary)) {
    return primary;
  }
  return secondary;
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
