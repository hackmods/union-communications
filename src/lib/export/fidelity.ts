/**
 * Coarse PNG fidelity helpers for export-vs-preview assertions.
 * Phase 9b: brand field + ink survive capture.
 * Phase 9e: compareRasters for preview/capture ↔ download (no golden images).
 */

export interface PixelSample {
  orangeish: number;
  lightInk: number;
  darkInk: number;
  other: number;
  width: number;
  height: number;
}

export interface RasterBuffer {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface CompareRastersOptions {
  /**
   * Max per-channel delta (0–255) before a pixel counts as different.
   * Default 24 — tolerates AA / JPEG / html-to-image vs Chromium paint.
   */
  threshold?: number;
  /** Fail when mismatched pixel ratio exceeds this (0–1). Default 0.04 (4%). */
  maxDiffRatio?: number;
  /** Ignore fully transparent pixels in either raster. Default true. */
  ignoreTransparent?: boolean;
}

export interface CompareRastersResult {
  ok: boolean;
  diffRatio: number;
  mismatched: number;
  compared: number;
  reason?: string;
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

/**
 * Nearest-neighbour resize into RGBA (for comparing different capture scales).
 */
export function resizeRasterNearest(
  src: RasterBuffer,
  width: number,
  height: number,
): RasterBuffer {
  if (src.width === width && src.height === height) {
    return {
      data: src.data instanceof Uint8ClampedArray
        ? src.data
        : new Uint8ClampedArray(src.data),
      width,
      height,
    };
  }
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(
      src.height - 1,
      Math.floor((y * src.height) / height),
    );
    for (let x = 0; x < width; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / width));
      const si = (sy * src.width + sx) * 4;
      const di = (y * width + x) * 4;
      out[di] = src.data[si] ?? 0;
      out[di + 1] = src.data[si + 1] ?? 0;
      out[di + 2] = src.data[si + 2] ?? 0;
      out[di + 3] = src.data[si + 3] ?? 0;
    }
  }
  return { data: out, width, height };
}

/**
 * Pixel diff between two RGBA rasters. Resizes `b` to `a`'s dimensions when needed.
 */
export function compareRasters(
  a: RasterBuffer,
  b: RasterBuffer,
  opts: CompareRastersOptions = {},
): CompareRastersResult {
  const threshold = opts.threshold ?? 24;
  const maxDiffRatio = opts.maxDiffRatio ?? 0.04;
  const ignoreTransparent = opts.ignoreTransparent ?? true;

  if (a.width < 2 || a.height < 2) {
    return {
      ok: false,
      diffRatio: 1,
      mismatched: 0,
      compared: 0,
      reason: `reference raster too small (${a.width}×${a.height})`,
    };
  }
  if (b.width < 2 || b.height < 2) {
    return {
      ok: false,
      diffRatio: 1,
      mismatched: 0,
      compared: 0,
      reason: `candidate raster too small (${b.width}×${b.height})`,
    };
  }

  const bb =
    b.width === a.width && b.height === a.height
      ? b
      : resizeRasterNearest(b, a.width, a.height);

  let compared = 0;
  let mismatched = 0;
  const total = a.width * a.height;

  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const aA = a.data[o + 3] ?? 0;
    const bA = bb.data[o + 3] ?? 0;
    if (ignoreTransparent && (aA < 16 || bA < 16)) continue;

    compared++;
    const dr = Math.abs((a.data[o] ?? 0) - (bb.data[o] ?? 0));
    const dg = Math.abs((a.data[o + 1] ?? 0) - (bb.data[o + 1] ?? 0));
    const db = Math.abs((a.data[o + 2] ?? 0) - (bb.data[o + 2] ?? 0));
    if (dr > threshold || dg > threshold || db > threshold) {
      mismatched++;
    }
  }

  if (compared === 0) {
    return {
      ok: false,
      diffRatio: 1,
      mismatched: 0,
      compared: 0,
      reason: "no opaque pixels to compare",
    };
  }

  const diffRatio = mismatched / compared;
  if (diffRatio > maxDiffRatio) {
    return {
      ok: false,
      diffRatio,
      mismatched,
      compared,
      reason: `diff ${(diffRatio * 100).toFixed(2)}% > max ${(maxDiffRatio * 100).toFixed(2)}% (${mismatched}/${compared} px)`,
    };
  }

  return { ok: true, diffRatio, mismatched, compared };
}
