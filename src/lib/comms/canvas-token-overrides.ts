import type { BrandKit, BrandKitCanvas } from "@/types/entities";
import {
  resolveCanvasTokens,
  type CanvasTokens,
} from "@/lib/utils/canvas-tokens";

/**
 * Tool-local Advanced Brand Token overrides. Lets graphic / print tools try
 * type scale, density, alignment, QR plate, and surface without writing Brand
 * Kit or flipping collection profiles.
 */
export type CanvasTokenOverrides = Partial<
  Pick<
    BrandKitCanvas,
    | "alignmentBias"
    | "density"
    | "typeScale"
    | "qrPlate"
    | "surface"
    | "headlineFontId"
    | "bodyFontId"
  >
>;

export const EMPTY_CANVAS_TOKEN_OVERRIDES: CanvasTokenOverrides = {};

/** True when any override key is set (including explicit clears via delete). */
export function hasCanvasTokenOverrides(
  overrides: CanvasTokenOverrides | null | undefined,
): boolean {
  if (!overrides) return false;
  return Object.values(overrides).some((v) => v !== undefined && v !== null);
}

/**
 * Resolve Brand Kit canvas tokens with optional ephemeral tool overrides.
 * Does not mutate the stored Brand Kit.
 */
export function resolveCanvasTokensWithOverrides(
  brandKit: BrandKit,
  overrides?: CanvasTokenOverrides | null,
): CanvasTokens {
  if (!hasCanvasTokenOverrides(overrides)) {
    return resolveCanvasTokens(brandKit);
  }
  return resolveCanvasTokens({
    ...brandKit,
    canvas: {
      ...brandKit.canvas,
      ...overrides,
    },
  });
}
