export type MeetingBackgroundOrientation = "landscape" | "portrait";

export type MeetingBackgroundFormatId =
  | "hd"
  | "uhd"
  | "portrait-hd"
  | "portrait-uhd";

export type MeetingBackgroundFormatLabelKey =
  | "formatHd"
  | "formatUhd"
  | "formatPortraitHd"
  | "formatPortraitUhd";

export interface MeetingBackgroundFormat {
  id: MeetingBackgroundFormatId;
  orientation: MeetingBackgroundOrientation;
  /** Tailwind aspect utility for the live preview canvas */
  aspect: string;
  labelKey: MeetingBackgroundFormatLabelKey;
  exportWidthPx: number;
  exportHeightPx: number;
  /** Filename stem before local number / extension */
  filenameStem: string;
}

export const DEFAULT_MEETING_BACKGROUND_FORMAT: MeetingBackgroundFormatId =
  "hd";

export const DEFAULT_PORTRAIT_MEETING_BACKGROUND_FORMAT: MeetingBackgroundFormatId =
  "portrait-hd";

export const MEETING_BACKGROUND_FORMATS: Record<
  MeetingBackgroundFormatId,
  MeetingBackgroundFormat
> = {
  /** Zoom / Teams recommended virtual background */
  hd: {
    id: "hd",
    orientation: "landscape",
    aspect: "aspect-[16/9]",
    labelKey: "formatHd",
    exportWidthPx: 1920,
    exportHeightPx: 1080,
    filenameStem: "meeting-background-hd",
  },
  /** High-DPI / large display virtual background */
  uhd: {
    id: "uhd",
    orientation: "landscape",
    aspect: "aspect-[16/9]",
    labelKey: "formatUhd",
    exportWidthPx: 3840,
    exportHeightPx: 2160,
    filenameStem: "meeting-background-uhd",
  },
  /** Phone + portrait webcam / tall display */
  "portrait-hd": {
    id: "portrait-hd",
    orientation: "portrait",
    aspect: "aspect-[9/16]",
    labelKey: "formatPortraitHd",
    exportWidthPx: 1080,
    exportHeightPx: 1920,
    filenameStem: "meeting-background-portrait-hd",
  },
  /** Vertical monitors / high-DPI portrait */
  "portrait-uhd": {
    id: "portrait-uhd",
    orientation: "portrait",
    aspect: "aspect-[9/16]",
    labelKey: "formatPortraitUhd",
    exportWidthPx: 2160,
    exportHeightPx: 3840,
    filenameStem: "meeting-background-portrait-uhd",
  },
};

const FORMAT_ORDER: readonly MeetingBackgroundFormatId[] = [
  "hd",
  "uhd",
  "portrait-hd",
  "portrait-uhd",
];

export function meetingBackgroundFormats(): readonly MeetingBackgroundFormat[] {
  return FORMAT_ORDER.map((id) => MEETING_BACKGROUND_FORMATS[id]);
}

export function orientationOf(
  format: MeetingBackgroundFormat | MeetingBackgroundFormatId,
): MeetingBackgroundOrientation {
  const id = typeof format === "string" ? format : format.id;
  return MEETING_BACKGROUND_FORMATS[id].orientation;
}

export function formatsForOrientation(
  orientation: MeetingBackgroundOrientation,
): readonly MeetingBackgroundFormat[] {
  return meetingBackgroundFormats().filter((f) => f.orientation === orientation);
}

/** Map HD↔HD / UHD↔UHD when flipping landscape ↔ portrait. */
export function matchingFormatForOrientation(
  currentId: MeetingBackgroundFormatId,
  orientation: MeetingBackgroundOrientation,
): MeetingBackgroundFormatId {
  const current = MEETING_BACKGROUND_FORMATS[currentId];
  if (current.orientation === orientation) return currentId;

  const isUhd = currentId === "uhd" || currentId === "portrait-uhd";
  if (orientation === "portrait") {
    return isUhd ? "portrait-uhd" : "portrait-hd";
  }
  return isUhd ? "uhd" : "hd";
}

/** Scale live preview width so captured PNG matches target pixels. */
export function exportPixelRatio(
  node: HTMLElement | null,
  format: MeetingBackgroundFormat,
): number {
  const target = format.exportWidthPx;
  const width = node?.offsetWidth ?? 0;
  if (target && width > 0) return target / width;
  return 2;
}
