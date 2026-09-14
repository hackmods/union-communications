import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import {
  flexAlignFromBias,
  textAlignFromBias,
} from "@/lib/utils/canvas-tokens";

export type GraphicLayoutChrome = {
  pad: number;
  titlePx?: number;
  bodyPx?: number;
  metaPx?: number;
  textAlign?: "left" | "center" | "right";
  alignItems?: "flex-start" | "center";
  titleWeight?: number;
  titleTracking?: string;
  titleTransform?: "none" | "uppercase";
  headlineFontFamily?: string;
  bodyFontFamily?: string;
  bodyFontWeight?: number;
  bodyLineHeight?: number;
};

/**
 * Shared pad / type metrics for Graphic Maker / Quote Card.
 *
 * Canvas Core authors these at 1080 / 1920 design px. Brand Kit title tokens
 * are letter-ish (~28–36). Pass `designWidthPx` so type scales with the sheet
 * — otherwise social exports stay postage-stamp. Brand Kit type scale is only
 * a multiplier, not required.
 *
 * `exportMode` stays for pad / slight title boost. Preview and export now
 * share the same design-px canvas (CanvasWrapper scales the sheet).
 */
export const GRAPHIC_TYPE_REFERENCE_WIDTH_PX = 540;

export function graphicLayoutChrome(
  tokens: CanvasTokens | undefined,
  exportMode: boolean,
  designWidthPx?: number,
): GraphicLayoutChrome {
  const pad = tokens
    ? Math.round(tokens.paddingPx * (exportMode ? 1 : 0.7))
    : exportMode
      ? 32
      : 16;
  if (!tokens) {
    if (!designWidthPx) return { pad };
    const fallbackScale = Math.min(
      2.4,
      Math.max(1, designWidthPx / GRAPHIC_TYPE_REFERENCE_WIDTH_PX),
    );
    return {
      pad: Math.max(pad, Math.round(designWidthPx * 0.04)),
      titlePx: Math.round(36 * fallbackScale),
      bodyPx: Math.round(20 * fallbackScale),
      metaPx: Math.min(
        22,
        Math.max(14, Math.round(16 * Math.min(fallbackScale, 1.35))),
      ),
    };
  }

  const scale =
    designWidthPx && designWidthPx > 0
      ? Math.min(2.4, Math.max(1, designWidthPx / GRAPHIC_TYPE_REFERENCE_WIDTH_PX))
      : 1;
  const titlePx = Math.round(
    tokens.titleFontSizePx * (exportMode ? 1.05 : 1) * scale,
  );
  const bodyPx = Math.round(
    tokens.subtitleFontSizePx * (exportMode ? 1.25 : 1) * scale,
  );
  return {
    pad: designWidthPx
      ? Math.max(20, Math.round(pad * Math.min(scale, 1.7)))
      : pad,
    titlePx,
    bodyPx,
    // Supporting chrome (badges, attribution). Cap for `expectMetaSupport`.
    metaPx: Math.min(
      22,
      Math.max(
        designWidthPx ? 14 : 10,
        Math.round(tokens.subtitleFontSizePx * 0.55 * Math.min(scale, 1.35)),
      ),
    ),
    textAlign: textAlignFromBias(tokens.alignmentBias),
    alignItems: flexAlignFromBias(tokens.alignmentBias),
    titleWeight: tokens.titleFontWeight,
    titleTracking: tokens.titleLetterSpacing,
    titleTransform: tokens.titleTextTransform,
    headlineFontFamily: tokens.headlineFontFamily,
    bodyFontFamily: tokens.bodyFontFamily,
    bodyFontWeight: tokens.bodyFontWeight,
    bodyLineHeight: tokens.bodyLineHeight,
  };
}
