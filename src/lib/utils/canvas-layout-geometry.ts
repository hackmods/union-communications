/**
 * Geometry helpers for canvas layout tests (clip / overlap / plate aspect).
 * Playwright measures live DOM; these functions stay DOM-free so Vitest can
 * lock the math. Keep `e2e/helpers/canvas-layout.ts` evaluate bodies in sync.
 */

export type LayoutRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export const PLATE_ASPECT_MIN = 0.85;
export const PLATE_ASPECT_MAX = 1.2;
export const PLATE_FILL_MIN = 0.65;

/** Intersection of `inner` with `outer`. Null when the clip has no area. */
export function clipRect(
  inner: LayoutRect,
  outer: LayoutRect,
): LayoutRect | null {
  const left = Math.max(inner.left, outer.left);
  const top = Math.max(inner.top, outer.top);
  const right = Math.min(inner.right, outer.right);
  const bottom = Math.min(inner.bottom, outer.bottom);
  if (bottom - top < 1 || right - left < 1) return null;
  return { left, top, right, bottom };
}

export function rectsOverlap(
  a: LayoutRect,
  b: LayoutRect,
  minPx: number = 1,
): boolean {
  const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  return oy > minPx && ox > minPx;
}

/** Square QR plates: height/width in [0.85, 1.2). */
export function plateAspectOk(
  aspect: number,
  min: number = PLATE_ASPECT_MIN,
  max: number = PLATE_ASPECT_MAX,
): boolean {
  return aspect > min && aspect < max;
}

export function rectOutside(
  inner: LayoutRect,
  outer: LayoutRect,
  epsilon: number = 1.5,
): boolean {
  return (
    inner.left < outer.left - epsilon ||
    inner.top < outer.top - epsilon ||
    inner.right > outer.right + epsilon ||
    inner.bottom > outer.bottom + epsilon
  );
}


/** Count pairwise overlaps among rects (each pair once). */
export function countOverlappingPairs(
  rects: readonly LayoutRect[],
  minPx: number = 1,
): number {
  let n = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (rectsOverlap(rects[i]!, rects[j]!, minPx)) n += 1;
    }
  }
  return n;
}
