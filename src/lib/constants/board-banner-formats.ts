/** Portrait pack sheets + strip / edge size presets for Board Banner & Trim. */

export type BoardSheetId = "letter" | "tabloid";

export type StripHeightId = "compact" | "standard" | "tall";

export type EdgeWidthId = "narrow" | "standard" | "wide";

export type BoardSheetLabelKey = "formatLetter" | "formatTabloid";

export type StripHeightLabelKey =
  | "stripCompact"
  | "stripStandard"
  | "stripTall";

export type EdgeWidthLabelKey =
  | "edgeNarrow"
  | "edgeStandard"
  | "edgeWide";

export interface BoardSheetFormat {
  id: BoardSheetId;
  aspect: string;
  labelKey: BoardSheetLabelKey;
  widthInches: number;
  heightInches: number;
  /** Outer margin kept empty on the pack sheet */
  marginInches: number;
  filenameStem: string;
}

export interface StripHeightPreset {
  id: StripHeightId;
  labelKey: StripHeightLabelKey;
  heightInches: number;
}

export interface EdgeWidthPreset {
  id: EdgeWidthId;
  labelKey: EdgeWidthLabelKey;
  widthInches: number;
}

export const DEFAULT_BOARD_SHEET: BoardSheetId = "letter";
export const DEFAULT_STRIP_HEIGHT: StripHeightId = "standard";
export const DEFAULT_EDGE_WIDTH: EdgeWidthId = "standard";

/** Gap / cut-mark channel between packed pieces */
export const PACK_GAP_INCHES = 0.15;

export const BOARD_SHEET_FORMATS: Record<BoardSheetId, BoardSheetFormat> = {
  letter: {
    id: "letter",
    aspect: "aspect-[8.5/11]",
    labelKey: "formatLetter",
    widthInches: 8.5,
    heightInches: 11,
    marginInches: 0.35,
    filenameStem: "board-banner-letter",
  },
  tabloid: {
    id: "tabloid",
    aspect: "aspect-[11/17]",
    labelKey: "formatTabloid",
    widthInches: 11,
    heightInches: 17,
    marginInches: 0.4,
    filenameStem: "board-banner-tabloid",
  },
};

export const STRIP_HEIGHT_PRESETS: Record<StripHeightId, StripHeightPreset> = {
  compact: {
    id: "compact",
    labelKey: "stripCompact",
    heightInches: 2.5,
  },
  standard: {
    id: "standard",
    labelKey: "stripStandard",
    heightInches: 3.5,
  },
  tall: {
    id: "tall",
    labelKey: "stripTall",
    heightInches: 4.5,
  },
};

export const EDGE_WIDTH_PRESETS: Record<EdgeWidthId, EdgeWidthPreset> = {
  narrow: {
    id: "narrow",
    labelKey: "edgeNarrow",
    widthInches: 1.5,
  },
  standard: {
    id: "standard",
    labelKey: "edgeStandard",
    widthInches: 2,
  },
  wide: {
    id: "wide",
    labelKey: "edgeWide",
    widthInches: 2.5,
  },
};

export const BOARD_SHEET_ORDER: readonly BoardSheetId[] = [
  "letter",
  "tabloid",
] as const;

export const STRIP_HEIGHT_ORDER: readonly StripHeightId[] = [
  "compact",
  "standard",
  "tall",
] as const;

export const EDGE_WIDTH_ORDER: readonly EdgeWidthId[] = [
  "narrow",
  "standard",
  "wide",
] as const;

export function boardSheetFormats(): readonly BoardSheetFormat[] {
  return BOARD_SHEET_ORDER.map((id) => BOARD_SHEET_FORMATS[id]);
}

export function stripHeightPresets(): readonly StripHeightPreset[] {
  return STRIP_HEIGHT_ORDER.map((id) => STRIP_HEIGHT_PRESETS[id]);
}

export function edgeWidthPresets(): readonly EdgeWidthPreset[] {
  return EDGE_WIDTH_ORDER.map((id) => EDGE_WIDTH_PRESETS[id]);
}

export function usableSheetSize(sheet: BoardSheetFormat): {
  widthInches: number;
  heightInches: number;
} {
  const m = sheet.marginInches * 2;
  return {
    widthInches: Math.max(0.5, sheet.widthInches - m),
    heightInches: Math.max(0.5, sheet.heightInches - m),
  };
}

/**
 * How many horizontal strips (banner / bottom) fit stacked on a sheet.
 * Always at least 1.
 */
export function bannersPerSheet(
  sheetHeightInches: number,
  stripHeightInches: number,
  gapInches: number = PACK_GAP_INCHES,
  marginInches = 0,
): number {
  const usable = Math.max(0, sheetHeightInches - marginInches * 2);
  if (stripHeightInches <= 0) return 1;
  const count = Math.floor((usable + gapInches) / (stripHeightInches + gapInches));
  return Math.max(1, count);
}

/**
 * How many vertical side-trim columns fit across a sheet width.
 * Always at least 1.
 */
export function sideColumnsPerSheet(
  sheetWidthInches: number,
  edgeWidthInches: number,
  gapInches: number = PACK_GAP_INCHES,
  marginInches = 0,
): number {
  const usable = Math.max(0, sheetWidthInches - marginInches * 2);
  if (edgeWidthInches <= 0) return 1;
  const count = Math.floor((usable + gapInches) / (edgeWidthInches + gapInches));
  return Math.max(1, count);
}

/**
 * How many square corner tiles fit in a grid on the usable sheet area.
 * Always at least 1.
 */
export function cornersPerSheet(
  sheetWidthInches: number,
  sheetHeightInches: number,
  edgeWidthInches: number,
  gapInches: number = PACK_GAP_INCHES,
  marginInches = 0,
): { cols: number; rows: number; total: number } {
  const usableW = Math.max(0, sheetWidthInches - marginInches * 2);
  const usableH = Math.max(0, sheetHeightInches - marginInches * 2);
  if (edgeWidthInches <= 0) {
    return { cols: 1, rows: 1, total: 1 };
  }
  const cols = Math.max(
    1,
    Math.floor((usableW + gapInches) / (edgeWidthInches + gapInches)),
  );
  const rows = Math.max(
    1,
    Math.floor((usableH + gapInches) / (edgeWidthInches + gapInches)),
  );
  return { cols, rows, total: cols * rows };
}

export function packCountForMode(args: {
  mode: "banner" | "trim";
  trimPiece: "top" | "side" | "bottom" | "corner";
  sheet: BoardSheetFormat;
  stripHeightInches: number;
  edgeWidthInches: number;
}): number {
  const { mode, trimPiece, sheet, stripHeightInches, edgeWidthInches } = args;
  if (mode === "banner" || trimPiece === "bottom" || trimPiece === "top") {
    return bannersPerSheet(
      sheet.heightInches,
      stripHeightInches,
      PACK_GAP_INCHES,
      sheet.marginInches,
    );
  }
  if (trimPiece === "side") {
    return sideColumnsPerSheet(
      sheet.widthInches,
      edgeWidthInches,
      PACK_GAP_INCHES,
      sheet.marginInches,
    );
  }
  return cornersPerSheet(
    sheet.widthInches,
    sheet.heightInches,
    edgeWidthInches,
    PACK_GAP_INCHES,
    sheet.marginInches,
  ).total;
}

export function sheetFilenameStem(
  sheet: BoardSheetFormat,
  mode: "banner" | "trim",
  trimPiece?: string,
): string {
  if (mode === "banner") return `${sheet.filenameStem}-pack`;
  return `board-trim-${trimPiece ?? "side"}-${sheet.id}-pack`;
}

/** @deprecated Use BoardSheetId — kept alias for gradual migration */
export type BoardBannerFormatId = BoardSheetId;
export type BoardBannerFormat = BoardSheetFormat;
export const BOARD_BANNER_FORMATS = BOARD_SHEET_FORMATS;
export const DEFAULT_BOARD_BANNER_FORMAT = DEFAULT_BOARD_SHEET;
export const boardBannerFormats = boardSheetFormats;

export function trimFilenameStem(
  format: BoardSheetFormat,
  piece: string,
): string {
  return `board-trim-${piece}-${format.id}`;
}
