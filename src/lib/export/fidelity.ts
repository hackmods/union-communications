/**
 * Coarse PNG fidelity helpers for export-vs-preview assertions.
 * Avoids golden images — checks that branded colour + ink survive capture.
 */

export interface PixelSample {
  orangeish: number;
  lightInk: number;
  darkInk: number;
  other: number;
  width: number;
  height: number;
}

export interface SamplePngOptions {
  /** Grid step in CSS pixels (larger = faster / coarser). */
  step?: number;
  /**
   * Brand primary target for “field colour” detection.
   * Defaults to UnionOps chrome orange.
   */
  primaryRgb?: { r: number; g: number; b: number };
}

function isNear(
  channel: number,
  target: number,
  tolerance: number,
): boolean {
  return Math.abs(channel - target) <= tolerance;
}

/**
 * Classify sampled pixels from ImageData (RGBA).
 */
export function sampleImageData(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options: SamplePngOptions = {},
): PixelSample {
  const step = options.step ?? 8;
  const primary = options.primaryRgb ?? { r: 194, g: 65, b: 12 };
  let orangeish = 0;
  let lightInk = 0;
  let darkInk = 0;
  let other = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const a = data[i + 3] ?? 0;
      if (a < 200) continue;

      const isPrimary =
        isNear(r, primary.r, 45) &&
        isNear(g, primary.g, 45) &&
        isNear(b, primary.b, 45);
      const isLight = r > 230 && g > 230 && b > 230;
      const isDark = r < 40 && g < 40 && b < 40;

      if (isPrimary) orangeish++;
      else if (isLight) lightInk++;
      else if (isDark) darkInk++;
      else other++;
    }
  }

  return { orangeish, lightInk, darkInk, other, width, height };
}

/** True when the raster has a branded field and some non-field ink/detail. */
export function assertCaptureHasBrandAndInk(
  sample: PixelSample,
  opts: { minField?: number; minInk?: number } = {},
): { ok: boolean; reason?: string } {
  const minField = opts.minField ?? 50;
  const minInk = opts.minInk ?? 15;
  const field = sample.orangeish;
  const ink = sample.lightInk + sample.darkInk + sample.other;

  if (field < minField) {
    return {
      ok: false,
      reason: `brand field too sparse (${field} < ${minField})`,
    };
  }
  if (ink < minInk) {
    return {
      ok: false,
      reason: `ink/detail too sparse (${ink} < ${minInk}) — export may have washed out type`,
    };
  }
  return { ok: true };
}
