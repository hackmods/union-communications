export type QrCardSizeId =
  | "letter"
  | "half"
  | "quarter"
  | "square5"
  | "square4";

export interface QrCardSize {
  id: QrCardSizeId;
  /** Tailwind aspect utility */
  aspect: string;
  widthInches: number;
  heightInches: number;
  /** Suggested QR pixel width for export clarity */
  qrPixels: number;
}

export const QR_CARD_SIZES: Record<QrCardSizeId, QrCardSize> = {
  letter: {
    id: "letter",
    aspect: "aspect-[8.5/11]",
    widthInches: 8.5,
    heightInches: 11,
    qrPixels: 280,
  },
  half: {
    id: "half",
    aspect: "aspect-[5.5/8.5]",
    widthInches: 5.5,
    heightInches: 8.5,
    qrPixels: 220,
  },
  quarter: {
    id: "quarter",
    aspect: "aspect-[4.25/5.5]",
    widthInches: 4.25,
    heightInches: 5.5,
    qrPixels: 180,
  },
  square5: {
    id: "square5",
    aspect: "aspect-square",
    widthInches: 5,
    heightInches: 5,
    qrPixels: 200,
  },
  square4: {
    id: "square4",
    aspect: "aspect-square",
    widthInches: 4,
    heightInches: 4,
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
