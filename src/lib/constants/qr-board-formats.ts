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

/**
 * Largest square QR plate (CSS px) that fits a cell after title, URL, and
 * chrome. Explicit pixels avoid flex/container-query collapse that left a
 * tall empty plate with a tiny code.
 */
export function qrBoardPlatePx(opts: {
  format: QrBoardFormat;
  slotCount: number;
  showUrl: boolean;
  includeBranding: boolean;
  paddingPx: number;
}): number {
  const cols = qrBoardGridColumns(opts.slotCount);
  const rows = qrBoardGridRows(opts.slotCount);
  const isTabloid = opts.format.id === "tabloid";
  const isDense = opts.slotCount >= 6;
  const previewH = Math.round(
    opts.format.previewWidthPx *
      (opts.format.heightInches / opts.format.widthInches),
  );
  const strip = isTabloid ? 10 : 8;
  const header = (opts.includeBranding ? (isTabloid ? 56 : 40) : 0) +
    (isTabloid ? 80 : 64);
  const footer = opts.includeBranding ? (isTabloid ? 32 : 26) : 0;
  const gridGap = isTabloid ? (isDense ? 18 : 24) : isDense ? 12 : 16;
  const cellGap = isTabloid ? 8 : 6;
  const titleBand = (isTabloid ? (isDense ? 16 : 18) : isDense ? 14 : 16) + cellGap;
  const urlBand = opts.showUrl
    ? (isDense ? 28 : 40) + cellGap
    : 0;

  const innerW = opts.format.previewWidthPx - opts.paddingPx * 2;
  const innerH =
    previewH - strip - opts.paddingPx * 2 - header - footer;
  const cellW = (innerW - gridGap * (cols - 1)) / cols;
  const cellH = (innerH - gridGap * (rows - 1)) / rows;
  const square = Math.min(
    cellW * (isDense ? 0.82 : 0.92),
    cellH - titleBand - urlBand,
  );
  return Math.max(36, Math.floor(square));
}
