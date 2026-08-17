export type QrBoardFormatId = "letter" | "tabloid";

export type QrBoardFormatLabelKey = "formatLetter" | "formatTabloid";

export interface QrBoardFormat {
  id: QrBoardFormatId;
  aspect: string;
  labelKey: QrBoardFormatLabelKey;
  widthInches: number;
  heightInches: number;
  /** Preview width in CSS px (~36 px/in so tabloid fits the form column) */
  previewWidthPx: number;
  /** Target QR encode size; canvas scales plates down in the grid */
  qrPixels: number;
  filenameStem: string;
}

const PREVIEW_PX_PER_INCH = 36;

export const DEFAULT_QR_BOARD_FORMAT: QrBoardFormatId = "letter";

export const QR_BOARD_FORMAT_ORDER: readonly QrBoardFormatId[] = [
  "letter",
  "tabloid",
];

export const QR_BOARD_FORMATS: Record<QrBoardFormatId, QrBoardFormat> = {
  letter: {
    id: "letter",
    aspect: "aspect-[8.5/11]",
    labelKey: "formatLetter",
    widthInches: 8.5,
    heightInches: 11,
    previewWidthPx: Math.round(8.5 * PREVIEW_PX_PER_INCH),
    qrPixels: 256,
    filenameStem: "qr-board-letter",
  },
  tabloid: {
    id: "tabloid",
    aspect: "aspect-[11/17]",
    labelKey: "formatTabloid",
    widthInches: 11,
    heightInches: 17,
    previewWidthPx: Math.round(11 * PREVIEW_PX_PER_INCH),
    qrPixels: 280,
    filenameStem: "qr-board-tabloid",
  },
};

/** ~200 dpi on preview width; clamp so capture stays sharp without huge blobs. */
export function qrBoardExportPixelRatio(format: QrBoardFormat): number {
  const target = format.widthInches * 200;
  const ratio = target / format.previewWidthPx;
  return Math.min(4, Math.max(2, Math.round(ratio * 10) / 10));
}

/** Column count for the QR cell grid. */
export function qrBoardGridColumns(slotCount: number): number {
  const n = Math.max(1, Math.min(8, Math.floor(slotCount)));
  if (n <= 2) return n;
  if (n === 3) return 3;
  if (n === 4) return 2;
  if (n <= 6) return 3;
  return 4;
}

export function qrBoardGridRows(slotCount: number): number {
  const cols = qrBoardGridColumns(slotCount);
  return Math.ceil(Math.max(1, slotCount) / cols);
}

export type QrBoardDensity = "roomy" | "regular" | "compact";

/** 2-up stays roomy; 3–4 (incl. 2×2 core links) is regular; 5+ is compact. */
export function qrBoardDensity(slotCount: number): QrBoardDensity {
  if (slotCount <= 2) return "roomy";
  if (slotCount <= 4) return "regular";
  return "compact";
}

export interface QrBoardChrome {
  density: QrBoardDensity;
  columns: number;
  rows: number;
  stripPx: number;
  padPx: number;
  stackGapPx: number;
  gridGapPx: number;
  cellGapPx: number;
  titleFontPx: number;
  subtitleFontPx: number;
  cellTitleFontPx: number;
  urlFontPx: number;
  localFontPx: number;
  useMarkLogo: boolean;
  headerBudgetPx: number;
  titleBandPx: number;
  urlBandPx: number;
  urlMaxLines: 1 | 2;
  urlMaxChars: number;
  platePx: number;
  /** Width of the plate as % of the grid cell — scales when the preview shrinks. */
  plateCellPercent: number;
}

/**
 * Shared chrome + plate size for letter/tabloid boards. Type is capped so
 * Brand Kit “display” does not eat the QR. Local branding sits in the header
 * (no bottom footer band).
 */
export function qrBoardChrome(opts: {
  format: QrBoardFormat;
  slotCount: number;
  showUrl: boolean;
  includeBranding: boolean;
  typeScale?: number;
}): QrBoardChrome {
  const density = qrBoardDensity(opts.slotCount);
  const columns = qrBoardGridColumns(opts.slotCount);
  const rows = qrBoardGridRows(opts.slotCount);
  const isTabloid = opts.format.id === "tabloid";
  const scale = Math.min(1, opts.typeScale ?? 1);

  const titleFontPx = Math.round(
    (isTabloid
      ? density === "compact"
        ? 16
        : density === "regular"
          ? 18
          : 22
      : density === "compact"
        ? 13
        : density === "regular"
          ? 15
          : 17) * scale,
  );
  const subtitleFontPx = Math.round(
    (isTabloid ? (density === "roomy" ? 12 : 11) : density === "roomy" ? 11 : 10) *
      scale,
  );
  const cellTitleFontPx = Math.round(
    (isTabloid
      ? density === "compact"
        ? 11
        : 12
      : density === "compact"
        ? 9
        : 10) * scale,
  );
  const urlFontPx = Math.max(
    9,
    Math.round((isTabloid ? (density === "roomy" ? 11 : 10) : 9) * scale),
  );
  const localFontPx = isTabloid ? 10 : 9;

  const stripPx = isTabloid ? 8 : 6;
  const padPx =
    density === "compact" ? (isTabloid ? 14 : 10) : density === "regular" ? (isTabloid ? 16 : 12) : isTabloid ? 18 : 14;
  const stackGapPx = density === "roomy" ? 8 : 6;
  const gridGapPx =
    density === "compact" ? (isTabloid ? 10 : 8) : density === "regular" ? (isTabloid ? 12 : 10) : isTabloid ? 14 : 12;
  const cellGapPx = 4;
  const urlMaxLines: 1 | 2 = density === "compact" ? 1 : 2;
  const urlMaxChars = density === "compact" ? 28 : density === "regular" ? 40 : 56;

  const logoBand = opts.includeBranding ? (isTabloid ? 36 : 30) : 0;
  const localBand = opts.includeBranding ? localFontPx + 4 : 0;
  const headerBudgetPx =
    logoBand +
    titleFontPx +
    subtitleFontPx +
    localBand +
    (opts.includeBranding ? 10 : 6);

  const titleBandPx = cellTitleFontPx + cellGapPx;
  const urlBandPx = opts.showUrl
    ? Math.round(urlFontPx * 1.3 * urlMaxLines) + cellGapPx
    : 0;

  const previewH = Math.round(
    opts.format.previewWidthPx *
      (opts.format.heightInches / opts.format.widthInches),
  );
  const innerW = opts.format.previewWidthPx - padPx * 2;
  const innerH = previewH - stripPx - padPx * 2 - headerBudgetPx - stackGapPx;
  const cellW = (innerW - gridGapPx * (columns - 1)) / columns;
  const cellH = (innerH - gridGapPx * (rows - 1)) / rows;
  const fill = density === "compact" ? 0.9 : 0.92;
  const square = Math.min(cellW * fill, cellH - titleBandPx - urlBandPx);
  const platePx = Math.max(40, Math.floor(square));
  const plateCellPercent = Math.max(
    40,
    Math.min(92, Math.round((platePx / Math.max(cellW, 1)) * 100)),
  );

  return {
    density,
    columns,
    rows,
    stripPx,
    padPx,
    stackGapPx,
    gridGapPx,
    cellGapPx,
    titleFontPx,
    subtitleFontPx,
    cellTitleFontPx,
    urlFontPx,
    localFontPx,
    useMarkLogo: density !== "roomy",
    headerBudgetPx,
    titleBandPx,
    urlBandPx,
    urlMaxLines,
    urlMaxChars,
    platePx,
    plateCellPercent,
  };
}

/** Largest square QR plate (CSS px) that fits a cell after compact chrome. */
export function qrBoardPlatePx(opts: {
  format: QrBoardFormat;
  slotCount: number;
  showUrl: boolean;
  includeBranding: boolean;
  paddingPx?: number;
  typeScale?: number;
}): number {
  return qrBoardChrome({
    format: opts.format,
    slotCount: opts.slotCount,
    showUrl: opts.showUrl,
    includeBranding: opts.includeBranding,
    typeScale: opts.typeScale,
  }).platePx;
}
