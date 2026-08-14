import type { BrandKit, CanvasTypeScale } from "@/types/entities";
import {
  resolveCanvasTokens,
  type CanvasTokens,
} from "@/lib/utils/canvas-tokens";
import type { FlyerFormatId } from "@/lib/comms/flyer-formats";

export type FlyerHeadlineCase = "uppercase" | "asTyped";

export type FlyerTypeScaleOverride = "inherit" | CanvasTypeScale;

export const FLYER_TYPE_SCALE_ORDER: readonly FlyerTypeScaleOverride[] = [
  "inherit",
  "display",
  "compact",
  "dense",
] as const;

/**
 * Resolve Brand Kit canvas tokens with optional flyer-local type scale and
 * format-aware density (half-letter denser; tabloid slightly larger).
 */
export function resolveFlyerTokens(
  brandKit: BrandKit,
  opts: {
    typeScaleOverride: FlyerTypeScaleOverride;
    headlineCase: FlyerHeadlineCase;
    format: FlyerFormatId;
  },
): CanvasTokens {
  const kit =
    opts.typeScaleOverride === "inherit"
      ? brandKit
      : {
          ...brandKit,
          canvas: {
            ...brandKit.canvas,
            typeScale: opts.typeScaleOverride,
          },
        };

  const base = resolveCanvasTokens(kit);
  const withCase: CanvasTokens = {
    ...base,
    titleTextTransform:
      opts.headlineCase === "uppercase" ? "uppercase" : "none",
  };

  if (opts.format === "halfLetter") {
    return {
      ...withCase,
      paddingPx: Math.round(withCase.paddingPx * 0.72),
      gapPx: Math.max(6, Math.round(withCase.gapPx * 0.8)),
      titleFontSizePx: Math.round(withCase.titleFontSizePx * 0.82),
      subtitleFontSizePx: Math.max(
        11,
        Math.round(withCase.subtitleFontSizePx * 0.9),
      ),
    };
  }

  if (opts.format === "tabloid") {
    return {
      ...withCase,
      paddingPx: Math.round(withCase.paddingPx * 1.12),
      gapPx: Math.round(withCase.gapPx * 1.1),
      titleFontSizePx: Math.round(withCase.titleFontSizePx * 1.2),
      subtitleFontSizePx: Math.round(withCase.subtitleFontSizePx * 1.1),
    };
  }

  return withCase;
}
