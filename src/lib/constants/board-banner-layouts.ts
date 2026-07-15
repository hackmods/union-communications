/** Banner compositions and trim tile variants — generic geometry, no union names. */

export type BoardBannerMode = "banner" | "trim";

export type BannerLayoutId = "slantCallout" | "centeredLockup" | "minimalStripe";

export type TrimPieceId = "side" | "bottom" | "corner";

export type BannerLayoutLabelKey =
  | "layoutSlantCallout"
  | "layoutCenteredLockup"
  | "layoutMinimalStripe";

export type TrimPieceLabelKey =
  | "trimSide"
  | "trimBottom"
  | "trimCorner";

export interface BannerLayoutDef {
  id: BannerLayoutId;
  labelKey: BannerLayoutLabelKey;
  /** Whether the callout / slogan field applies */
  usesCallout: boolean;
}

export interface TrimPieceDef {
  id: TrimPieceId;
  labelKey: TrimPieceLabelKey;
}

export const DEFAULT_BANNER_LAYOUT: BannerLayoutId = "slantCallout";
export const DEFAULT_TRIM_PIECE: TrimPieceId = "side";
export const DEFAULT_BOARD_BANNER_MODE: BoardBannerMode = "banner";

export const BANNER_LAYOUTS: readonly BannerLayoutDef[] = [
  {
    id: "slantCallout",
    labelKey: "layoutSlantCallout",
    usesCallout: true,
  },
  {
    id: "centeredLockup",
    labelKey: "layoutCenteredLockup",
    usesCallout: false,
  },
  {
    id: "minimalStripe",
    labelKey: "layoutMinimalStripe",
    usesCallout: false,
  },
] as const;

export const TRIM_PIECES: readonly TrimPieceDef[] = [
  { id: "side", labelKey: "trimSide" },
  { id: "bottom", labelKey: "trimBottom" },
  { id: "corner", labelKey: "trimCorner" },
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
