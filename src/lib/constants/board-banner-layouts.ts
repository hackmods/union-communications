/** Banner compositions and trim kit variants — generic geometry, no union names. */

export type BoardBannerMode = "banner" | "trim";

export type BannerLayoutId = "slantCallout" | "centeredLockup" | "minimalStripe";

/** Frame pieces: horizontal top/bottom, vertical side, optional corner tiles */
export type TrimPieceId = "top" | "side" | "bottom" | "corner";

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
 * Frame kit: rails for a continuous border loop; corners optional
 * (off = rails run the full edge distance and butt together).
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
