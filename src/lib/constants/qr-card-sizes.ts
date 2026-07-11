export type QrCardSizeId =
  | "letter"
  | "half"
  | "quarter"
  | "square5"
  | "square4";

export interface QrCardSize {
  id: QrCardSizeId;
  widthInches: number;
  heightInches: number;
  /** Screen preview width (px) - scaled to physical width so sizes look different */
  previewWidthPx: number;
  /** Suggested QR pixel width for export clarity */
  qrPixels: number;
}

/** ~48 CSS px per inch keeps letter readable and makes quarter/half visibly smaller */
const PREVIEW_PX_PER_INCH = 48;

function previewWidth(widthInches: number): number {
  return Math.round(widthInches * PREVIEW_PX_PER_INCH);
}

export const QR_CARD_SIZES: Record<QrCardSizeId, QrCardSize> = {
  letter: {
    id: "letter",
    widthInches: 8.5,
    heightInches: 11,
    previewWidthPx: previewWidth(8.5),
    qrPixels: 280,
  },
  half: {
    id: "half",
    widthInches: 5.5,
    heightInches: 8.5,
    previewWidthPx: previewWidth(5.5),
    qrPixels: 220,
  },
  quarter: {
    id: "quarter",
    widthInches: 4.25,
    heightInches: 5.5,
    previewWidthPx: previewWidth(4.25),
    qrPixels: 180,
  },
  square5: {
    id: "square5",
    widthInches: 5,
    heightInches: 5,
    previewWidthPx: previewWidth(5),
    qrPixels: 200,
  },
  square4: {
    id: "square4",
    widthInches: 4,
    heightInches: 4,
    previewWidthPx: previewWidth(4),
    qrPixels: 160,
  },
} as const;

export const QR_CARD_SIZE_ORDER: readonly QrCardSizeId[] = [
  "quarter",
  "half",
  "letter",
  "square5",
  "square4",
] as const;

export const DEFAULT_QR_CARD_SIZE: QrCardSizeId = "quarter";

/** Capture density so PDF/PNG stay sharp even when the on-screen preview is small */
export function qrCardExportPixelRatio(size: QrCardSize): number {
  const targetPx = size.widthInches * 200;
  return Math.max(2, Math.min(4, targetPx / size.previewWidthPx));
}
