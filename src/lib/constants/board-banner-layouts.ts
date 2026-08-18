/** Banner compositions and trim kit variants — generic geometry, no union names. */

export type BoardBannerMode = "banner" | "trim";

export type BannerLayoutId = "slantCallout" | "centeredLockup" | "minimalStripe";

/** Frame pieces: horizontal top/bottom, vertical side, optional corner tiles */
export type TrimPieceId = "top" | "side" | "bottom" | "corner";

/**
 * Upright board-corner tiles. Side/bottom rails never bake these in when
 * Corner is on — print a square for each joint instead of rotating one tile.
 */
export const CORNER_POSITIONS = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
] as const;

export type CornerPosition = (typeof CORNER_POSITIONS)[number];

export const DEFAULT_CORNER_POSITION: CornerPosition = "topLeft";

export type CornerPositionLabelKey =
  | "cornerTopLeft"
  | "cornerTopRight"
  | "cornerBottomLeft"
  | "cornerBottomRight";

export interface CornerPositionDef {
  id: CornerPosition;
  labelKey: CornerPositionLabelKey;
}

export const CORNER_POSITION_DEFS: readonly CornerPositionDef[] = [
  { id: "topLeft", labelKey: "cornerTopLeft" },
  { id: "topRight", labelKey: "cornerTopRight" },
  { id: "bottomLeft", labelKey: "cornerBottomLeft" },
  { id: "bottomRight", labelKey: "cornerBottomRight" },
] as const;

/** Packed corner sheets cycle through all four upright positions. */
export function cornerPositionAtIndex(index: number): CornerPosition {
  const n = CORNER_POSITIONS.length;
  const i = ((index % n) + n) % n;
  return CORNER_POSITIONS[i];
}

export function cornerPositionById(id: CornerPosition): CornerPositionDef {
  return CORNER_POSITION_DEFS.find((d) => d.id === id) ?? CORNER_POSITION_DEFS[0];
}

/** Rails keep coloured end caps only when Corner is off (butt-together loop). */
export function railsUseEndCaps(kit: TrimKit): boolean {
  return !kit.corner;
}

/** Primary / accent L-band polygons in a 100×100 viewBox (thickness 28 / 14). */
export function cornerLPolygons(position: CornerPosition): {
  primary: string;
  accent: string;
} {
  const band = 28;
  const accent = 14;
  const inner = 100 - band;
  const innerAccent = 100 - accent;
  switch (position) {
    case "topLeft":
      return {
        primary: `0,0 100,0 100,${band} ${band},${band} ${band},100 0,100`,
        accent: `0,0 100,0 100,${accent} ${accent},${accent} ${accent},100 0,100`,
      };
    case "topRight":
      return {
        primary: `0,0 100,0 100,100 ${inner},100 ${inner},${band} 0,${band}`,
        accent: `0,0 100,0 100,100 ${innerAccent},100 ${innerAccent},${accent} 0,${accent}`,
      };
    case "bottomLeft":
      return {
        primary: `0,0 ${band},0 ${band},${inner} 100,${inner} 100,100 0,100`,
        accent: `0,0 ${accent},0 ${accent},${innerAccent} 100,${innerAccent} 100,100 0,100`,
      };
    case "bottomRight":
      return {
        primary: `${inner},0 100,0 100,100 0,100 0,${inner} ${inner},${inner}`,
        accent: `${innerAccent},0 100,0 100,100 0,100 0,${innerAccent} ${innerAccent},${innerAccent}`,
      };
  }
}

export type BannerLayoutLabelKey =
  | "layoutSlantCallout"
  | "layoutCenteredLockup"
  | "layoutMinimalStripe";

export type BannerLayoutHintKey =
  | "layoutSlantCalloutHint"
  | "layoutCenteredLockupHint"
  | "layoutMinimalStripeHint";

export type TrimPieceLabelKey =
  | "trimTop"
  | "trimSide"
  | "trimBottom"
  | "trimCorner";

export type TrimPieceHintKey =
  | "trimTopHint"
  | "trimSideHint"
  | "trimBottomHint"
  | "trimCornerHint";

export interface BannerLayoutDef {
  id: BannerLayoutId;
  labelKey: BannerLayoutLabelKey;
  hintKey: BannerLayoutHintKey;
  /** Whether the callout / slogan field applies */
  usesCallout: boolean;
}

export interface TrimPieceDef {
  id: TrimPieceId;
  labelKey: TrimPieceLabelKey;
  hintKey: TrimPieceHintKey;
}

export const DEFAULT_BANNER_LAYOUT: BannerLayoutId = "slantCallout";
export const DEFAULT_TRIM_PIECE: TrimPieceId = "top";
export const DEFAULT_BOARD_BANNER_MODE: BoardBannerMode = "trim";

/**
 * Frame kit: rails for a continuous border loop; corners optional.
 * Off = rails keep end caps and run the full edge (butt together).
 * On = rails are side/bottom only; Corner prints four upright tiles.
 */
export interface TrimKit {
  top: boolean;
  side: boolean;
  bottom: boolean;
  corner: boolean;
}

/** Continuous loop default: top + sides + bottom, no corner tiles */
export const DEFAULT_TRIM_KIT: TrimKit = {
  top: true,
  side: true,
  bottom: true,
  corner: false,
};

export const BANNER_LAYOUTS: readonly BannerLayoutDef[] = [
  {
    id: "slantCallout",
    labelKey: "layoutSlantCallout",
    hintKey: "layoutSlantCalloutHint",
    usesCallout: true,
  },
  {
    id: "centeredLockup",
    labelKey: "layoutCenteredLockup",
    hintKey: "layoutCenteredLockupHint",
    usesCallout: false,
  },
  {
    id: "minimalStripe",
    labelKey: "layoutMinimalStripe",
    hintKey: "layoutMinimalStripeHint",
    usesCallout: false,
  },
] as const;

export const TRIM_PIECES: readonly TrimPieceDef[] = [
  { id: "top", labelKey: "trimTop", hintKey: "trimTopHint" },
  { id: "side", labelKey: "trimSide", hintKey: "trimSideHint" },
  { id: "bottom", labelKey: "trimBottom", hintKey: "trimBottomHint" },
  { id: "corner", labelKey: "trimCorner", hintKey: "trimCornerHint" },
] as const;

export function bannerLayoutById(id: BannerLayoutId): BannerLayoutDef {
  return BANNER_LAYOUTS.find((l) => l.id === id) ?? BANNER_LAYOUTS[0];
}

export function trimPieceById(id: TrimPieceId): TrimPieceDef {
  return TRIM_PIECES.find((p) => p.id === id) ?? TRIM_PIECES[0];
}

export function bannerLayoutUsesCallout(id: BannerLayoutId): boolean {
  return bannerLayoutById(id).usesCallout;
}

/** Horizontal strips (header art or bottom rail). */
export function isHorizontalTrimPiece(piece: TrimPieceId): boolean {
  return piece === "top" || piece === "bottom";
}

/** Ordered list of piece types included in the frame kit export. */
export function selectedTrimPieces(kit: TrimKit): TrimPieceId[] {
  const pieces: TrimPieceId[] = [];
  if (kit.top) pieces.push("top");
  if (kit.side) pieces.push("side");
  if (kit.bottom) pieces.push("bottom");
  if (kit.corner) pieces.push("corner");
  return pieces;
}

export function kitHasAnyPiece(kit: TrimKit): boolean {
  return kit.top || kit.side || kit.bottom || kit.corner;
}

/**
 * Toggle any kit piece. Refuses an empty kit (must keep at least one piece).
 * Corner is optional — off for continuous full-edge rails.
 */
export function toggleTrimPiece(kit: TrimKit, piece: TrimPieceId): TrimKit {
  const next: TrimKit = { ...kit, [piece]: !kit[piece] };
  if (!kitHasAnyPiece(next)) return kit;
  return next;
}

/** Keep focus on a piece that is still in the kit. */
export function resolveTrimFocus(
  kit: TrimKit,
  focus: TrimPieceId,
): TrimPieceId {
  const selected = selectedTrimPieces(kit);
  if (selected.includes(focus)) return focus;
  return selected[0] ?? "top";
}
