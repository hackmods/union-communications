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
 * Shared pad / type metrics for Graphic Maker layouts (preview vs export).
 *
 * Preview is already column-width (`MobilePreviewStage` scales on small
 * screens). Do not shrink type again — a 0.72× factor made live previews look
 * empty next to export.
 */
export function graphicLayoutChrome(
  tokens: CanvasTokens | undefined,
  exportMode: boolean,
): GraphicLayoutChrome {
  const pad = tokens
    ? Math.round(tokens.paddingPx * (exportMode ? 1 : 0.7))
    : exportMode
      ? 32
      : 16;
  if (!tokens) return { pad };
  return {
    pad,
    titlePx: Math.round(tokens.titleFontSizePx * (exportMode ? 1.05 : 1)),
    bodyPx: Math.round(tokens.subtitleFontSizePx * (exportMode ? 1.25 : 1)),
    metaPx: Math.max(11, Math.round(tokens.subtitleFontSizePx * 0.85)),
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
