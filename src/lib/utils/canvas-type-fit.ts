/**
 * Content-aware type fit for fixed-height print canvases.
 *
 * Brand Kit tokens set the *preferred* type size. When a stack/band/split
 * slot is shorter than the copy needs (long headlines, lockup logos, dense
 * meta), we shrink uniformly so title + body stay inside the slot instead of
 * painting over Date/Time/Location siblings.
 *
 * Live DOM still iterates (wrapping changes height); these helpers lock the
 * clamp / step math for unit tests and keep CanvasTypeBlock honest.
 */

/** Floor so steward copy stays readable on letter previews (~36 px/in). */
export const CANVAS_TYPE_FIT_MIN_SCALE = 0.42;

/** Ceiling — never upscale past Brand Kit tokens. */
export const CANVAS_TYPE_FIT_MAX_SCALE = 1;

/** Per-pass shrink while measuring overflow in the layout effect. */
export const CANVAS_TYPE_FIT_STEP = 0.04;

/** Max shrink passes when measuring live overflow. */
export const CANVAS_TYPE_FIT_MAX_ITERS = 24;

export type TypeFitScaleOptions = {
  minScale?: number;
  maxScale?: number;
};

/**
 * Ideal uniform scale so `contentHeight * scale` fits `availableHeight`.
 * Linear estimate — real layouts re-measure because line wraps change.
 */
export function estimateTypeFitScale(
  contentHeightPx: number,
  availableHeightPx: number,
  opts: TypeFitScaleOptions = {},
): number {
  const min = opts.minScale ?? CANVAS_TYPE_FIT_MIN_SCALE;
  const max = opts.maxScale ?? CANVAS_TYPE_FIT_MAX_SCALE;
  if (
    !(contentHeightPx > 0) ||
    !(availableHeightPx > 0) ||
    contentHeightPx <= availableHeightPx
  ) {
    return max;
  }
  const raw = availableHeightPx / contentHeightPx;
  return clampTypeFitScale(raw, min, max);
}

export function clampTypeFitScale(
  scale: number,
  min: number = CANVAS_TYPE_FIT_MIN_SCALE,
  max: number = CANVAS_TYPE_FIT_MAX_SCALE,
): number {
  if (!Number.isFinite(scale)) return max;
  return Math.min(max, Math.max(min, scale));
}

/** Step toward min while content still overflows the slot. */
export function nextTypeFitScale(
  current: number,
  overflowing: boolean,
  opts: { minScale?: number; step?: number } = {},
): number {
  const min = opts.minScale ?? CANVAS_TYPE_FIT_MIN_SCALE;
  const step = opts.step ?? CANVAS_TYPE_FIT_STEP;
  if (!overflowing) return clampTypeFitScale(current, min);
  return clampTypeFitScale(current - step, min);
}

/**
 * True when the measured box is taller or wider than its layout box.
 * Half-pixel slack matches FitStackedHeadline / mobile preview tolerances.
 */
export function typeFitOverflows(
  scrollWidth: number,
  scrollHeight: number,
  clientWidth: number,
  clientHeight: number,
  slackPx = 0.5,
): boolean {
  if (!(clientWidth > 0) || !(clientHeight > 0)) return false;
  return (
    scrollHeight > clientHeight + slackPx || scrollWidth > clientWidth + slackPx
  );
}

/** Scaled font size — never below `floorPx` for capture legibility. */
export function fittedFontSizePx(
  basePx: number,
  scale: number,
  floorPx: number,
): number {
  return Math.max(floorPx, Math.round(basePx * scale));
}
