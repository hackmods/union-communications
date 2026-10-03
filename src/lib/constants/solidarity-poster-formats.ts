import {
  printPageExportPixelRatio,
  printPagePreviewHeightPx,
  printPagePreviewWidthPx,
} from "@/lib/comms/print-page-formats";

export type OutputMedium = "print" | "digital";

export type PosterFormatId =
  | "letter"
  | "tabloid"
  | "horizontal"
  | "wide"
  | "vertical";

export type PosterFormatLabelKey =
  | "formatLetter"
  | "formatTabloid"
  | "formatHorizontal"
  | "formatWide"
  | "formatVertical";

export interface SolidarityPosterFormat {
  id: PosterFormatId;
  medium: OutputMedium;
  /** Tailwind aspect utility for legacy fluid previews (digital now uses design px). */
  aspect: string;
  labelKey: PosterFormatLabelKey;
  /** Print page size (inches). Absent for digital wallpapers. */
  widthInches?: number;
  heightInches?: number;
  /**
   * Fixed CSS design width for CanvasWrapper authoring.
   * Print: letter/tabloid denser sheets. Digital: HD design px (export pixelRatio upscales).
   */
  previewWidthPx?: number;
  /** Fixed CSS design height — required with previewWidthPx for digital sheets. */
  previewHeightPx?: number;
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

/** Desktop wallpaper design box (16:9). Export doubles to 3840×2160. */
export const SOLIDARITY_DIGITAL_HORIZONTAL_DESIGN = {
  width: 1920,
  height: 1080,
} as const;

/** Ultrawide phone landscape (~19.5:9). */
export const SOLIDARITY_DIGITAL_WIDE_DESIGN = {
  width: 1950,
  height: 900,
} as const;

/** Phone portrait wallpaper (9:16). */
export const SOLIDARITY_DIGITAL_VERTICAL_DESIGN = {
  width: 1080,
  height: 1920,
} as const;

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
    previewWidthPx: printPagePreviewWidthPx(8.5),
    filenameStem: "solidarity-poster-letter",
  },
  tabloid: {
    id: "tabloid",
    medium: "print",
    aspect: "aspect-[11/17]",
    labelKey: "formatTabloid",
    widthInches: 11,
    heightInches: 17,
    previewWidthPx: printPagePreviewWidthPx(11),
    filenameStem: "solidarity-poster-tabloid",
  },
  /** Desktop / monitor wallpaper */
  horizontal: {
    id: "horizontal",
    medium: "digital",
    aspect: "aspect-[16/9]",
    labelKey: "formatHorizontal",
    previewWidthPx: SOLIDARITY_DIGITAL_HORIZONTAL_DESIGN.width,
    previewHeightPx: SOLIDARITY_DIGITAL_HORIZONTAL_DESIGN.height,
    exportWidthPx: 3840,
    exportHeightPx: 2160,
    filenameStem: "solidarity-wallpaper-desktop",
  },
  /** Modern phone landscape (~19.5:9), FHD+ */
  wide: {
    id: "wide",
    medium: "digital",
    aspect: "aspect-[19.5/9]",
    labelKey: "formatWide",
    previewWidthPx: SOLIDARITY_DIGITAL_WIDE_DESIGN.width,
    previewHeightPx: SOLIDARITY_DIGITAL_WIDE_DESIGN.height,
    exportWidthPx: 2340,
    exportHeightPx: 1080,
    filenameStem: "solidarity-wallpaper-wide",
  },
  /** Generic phone portrait wallpaper */
  vertical: {
    id: "vertical",
    medium: "digital",
    aspect: "aspect-[9/16]",
    labelKey: "formatVertical",
    previewWidthPx: SOLIDARITY_DIGITAL_VERTICAL_DESIGN.width,
    previewHeightPx: SOLIDARITY_DIGITAL_VERTICAL_DESIGN.height,
    exportWidthPx: 1080,
    exportHeightPx: 1920,
    filenameStem: "solidarity-wallpaper-phone",
  },
};

const PRINT_ORDER: readonly PosterFormatId[] = ["letter", "tabloid"];
const DIGITAL_ORDER: readonly PosterFormatId[] = [
  "horizontal",
  "wide",
  "vertical",
];

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

export function isLandscapeFormat(format: SolidarityPosterFormat): boolean {
  if (format.previewWidthPx && format.previewHeightPx) {
    return format.previewWidthPx > format.previewHeightPx;
  }
  if (format.exportWidthPx && format.exportHeightPx) {
    return format.exportWidthPx > format.exportHeightPx;
  }
  if (format.widthInches && format.heightInches) {
    return format.widthInches > format.heightInches;
  }
  return false;
}

/**
 * Design height for CanvasWrapper — print from inches, digital from previewHeightPx.
 */
export function solidarityPosterDesignHeightPx(
  format: SolidarityPosterFormat,
): number | undefined {
  if (
    typeof format.previewHeightPx === "number" &&
    format.previewHeightPx > 0
  ) {
    return format.previewHeightPx;
  }
  if (
    typeof format.previewWidthPx === "number" &&
    typeof format.widthInches === "number" &&
    typeof format.heightInches === "number"
  ) {
    return printPagePreviewHeightPx({
      previewWidthPx: format.previewWidthPx,
      widthInches: format.widthInches,
      heightInches: format.heightInches,
    });
  }
  return undefined;
}

/** Scale live preview width so captured PNG matches target wallpaper / print pixels. */
export function exportPixelRatio(
  node: HTMLElement | null,
  format: SolidarityPosterFormat,
): number {
  if (
    format.medium === "print" &&
    typeof format.previewWidthPx === "number"
  ) {
    return printPageExportPixelRatio({
      previewWidthPx: format.previewWidthPx,
      widthInches: format.widthInches ?? 8.5,
    });
  }
  const designW =
    format.previewWidthPx ??
    (node?.offsetWidth && node.offsetWidth > 0 ? node.offsetWidth : 0);
  const target = format.exportWidthPx;
  if (target && designW > 0) return target / designW;
  const width = node?.offsetWidth ?? 0;
  if (target && width > 0) return target / width;
  return 2;
}

export const solidarityPosterPreviewHeightPx = printPagePreviewHeightPx;
