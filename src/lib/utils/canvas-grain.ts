/**
 * Capture-safe grain tile for html-to-image exports.
 * Uses a tiny procedural PNG (no SVG feTurbulence — filters flake in capture).
 * Generated once per session on the client; SSR returns null.
 */

let cachedGrainDataUrl: string | null | undefined;

/** Deterministic LCG for stable noise across sessions */
function noiseAt(x: number, y: number, seed: number): number {
  let n = (x * 374761393 + y * 668265263 + seed) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function buildGrainDataUrl(size = 64): string | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const image = ctx.createImageData(size, size);
    const data = image.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = Math.floor(noiseAt(x, y, 243) * 255);
        const i = (y * size + x) * 4;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** Cached grain tile data URL, or null on SSR / failure. */
export function getGrainTileDataUrl(): string | null {
  if (cachedGrainDataUrl !== undefined) return cachedGrainDataUrl;
  cachedGrainDataUrl = buildGrainDataUrl();
  return cachedGrainDataUrl;
}

/** Test helper — clear cache between unit tests. */
export function resetGrainTileCache(): void {
  cachedGrainDataUrl = undefined;
}
