export type OutputMedium = "print" | "digital";

export type PosterFormatId = "letter" | "tabloid" | "horizontal" | "vertical";

export type PosterFormatLabelKey =
  | "formatLetter"
  | "formatTabloid"
  | "formatHorizontal"
  | "formatVertical";

export interface SolidarityPosterFormat {
  id: PosterFormatId;
  medium: OutputMedium;
  /** Tailwind aspect utility for the live preview canvas */
  aspect: string;
  labelKey: PosterFormatLabelKey;
  /** Print page size (inches). Absent for digital wallpapers. */
  widthInches?: number;
  heightInches?: number;
  /**
   * Target capture width in CSS pixels. When set, export scales so
   * `offsetWidth * pixelRatio ≈ exportWidthPx` (wallpaper sharpness).
   */
  exportWidthPx?: number;
  exportHeightPx?: number;
  /** Filename stem before local number / extension */
  filenameStem: string;
}

export const DEFAULT_PRINT_FORMAT: PosterFormatId = "letter";
export const DEFAULT_DIGITAL_FORMAT: PosterFormatId = "horizontal";

export const SOLIDARITY_POSTER_FORMATS: Record<
  PosterFormatId,
  SolidarityPosterFormat
> = {
  letter: {
    id: "letter",
    medium: "print",
    aspect: "aspect-[8.5/11]",
    labelKey: "formatLetter",
    widthInches: 8.5,
    heightInches: 11,
    filenameStem: "solidarity-poster-letter",
  },
  tabloid: {
    id: "tabloid",
    medium: "print",
    aspect: "aspect-[11/17]",
    labelKey: "formatTabloid",
    widthInches: 11,
    heightInches: 17,
    filenameStem: "solidarity-poster-tabloid",
  },
  horizontal: {
    id: "horizontal",
    medium: "digital",
    aspect: "aspect-[16/9]",
    labelKey: "formatHorizontal",
    exportWidthPx: 3840,
    exportHeightPx: 2160,
    filenameStem: "solidarity-wallpaper-horizontal",
  },
  vertical: {
    id: "vertical",
    medium: "digital",
    aspect: "aspect-[9/16]",
    labelKey: "formatVertical",
    exportWidthPx: 1080,
    exportHeightPx: 1920,
    filenameStem: "solidarity-wallpaper-vertical",
  },
};

const PRINT_ORDER: readonly PosterFormatId[] = ["letter", "tabloid"];
const DIGITAL_ORDER: readonly PosterFormatId[] = ["horizontal", "vertical"];

export function formatsForMedium(
  medium: OutputMedium,
): readonly SolidarityPosterFormat[] {
  const order = medium === "print" ? PRINT_ORDER : DIGITAL_ORDER;
  return order.map((id) => SOLIDARITY_POSTER_FORMATS[id]);
}

export function defaultFormatForMedium(medium: OutputMedium): PosterFormatId {
  return medium === "print" ? DEFAULT_PRINT_FORMAT : DEFAULT_DIGITAL_FORMAT;
}

export function supportsPdf(format: SolidarityPosterFormat): boolean {
  return (
    format.medium === "print" &&
    typeof format.widthInches === "number" &&
    typeof format.heightInches === "number"
  );
}

/** Scale live preview width so captured PNG matches target wallpaper pixels. */
export function exportPixelRatio(
  node: HTMLElement | null,
  format: SolidarityPosterFormat,
): number {
  const target = format.exportWidthPx;
  const width = node?.offsetWidth ?? 0;
  if (target && width > 0) return target / width;
  return 2;
}
