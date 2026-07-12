/**
 * Interlocking lowercase u + o geometry for the UnionOps platform mark.
 * Colour mapping: u ← graphics accent (secondary); o ← primary.
 * Reference rasters: public/assets/unionops/source/uo-mark.png, uo-lockup.png
 */

export const UNIONOPS_MARK_VIEWBOX = "0 0 64 64";

/** Rounded-U stroke path (open top). Drawn atop the O for the interlocking overlap. */
export const UNIONOPS_U_PATH = "M12 14v20a14 14 0 0 0 28 0V14";

export const UNIONOPS_U_STROKE_WIDTH = 10;

export const UNIONOPS_O = {
  cx: 44,
  cy: 34,
  r: 14,
  strokeWidth: 10,
} as const;

/** Soft overlap so the u reads as linked through the o. */
export const UNIONOPS_U_OPACITY = 0.88;
