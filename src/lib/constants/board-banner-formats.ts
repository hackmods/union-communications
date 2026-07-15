/** Print formats for board banner strips and trim tiles (landscape). */

export type BoardBannerFormatId = "letter" | "tabloid";

export type BoardBannerFormatLabelKey = "formatLetter" | "formatTabloid";

export interface BoardBannerFormat {
  id: BoardBannerFormatId;
  /** Tailwind aspect utility for the live preview canvas */
  aspect: string;
  labelKey: BoardBannerFormatLabelKey;
  widthInches: number;
  heightInches: number;
  /** Filename stem before local number / extension */
  filenameStem: string;
}

export const DEFAULT_BOARD_BANNER_FORMAT: BoardBannerFormatId = "letter";

export const BOARD_BANNER_FORMATS: Record<
  BoardBannerFormatId,
  BoardBannerFormat
> = {
  letter: {
    id: "letter",
    aspect: "aspect-[11/8.5]",
    labelKey: "formatLetter",
    widthInches: 11,
    heightInches: 8.5,
    filenameStem: "board-banner-letter",
  },
  tabloid: {
    id: "tabloid",
    aspect: "aspect-[17/11]",
    labelKey: "formatTabloid",
    widthInches: 17,
    heightInches: 11,
    filenameStem: "board-banner-tabloid",
  },
};

export const BOARD_BANNER_FORMAT_ORDER: readonly BoardBannerFormatId[] = [
  "letter",
  "tabloid",
] as const;

export function boardBannerFormats(): readonly BoardBannerFormat[] {
  return BOARD_BANNER_FORMAT_ORDER.map((id) => BOARD_BANNER_FORMATS[id]);
}

export function trimFilenameStem(
  format: BoardBannerFormat,
  piece: string,
): string {
  return `board-trim-${piece}-${format.id}`;
}
