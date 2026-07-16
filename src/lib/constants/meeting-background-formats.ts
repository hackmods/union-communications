export type MeetingBackgroundFormatId = "hd" | "uhd";

export type MeetingBackgroundFormatLabelKey = "formatHd" | "formatUhd";

export interface MeetingBackgroundFormat {
  id: MeetingBackgroundFormatId;
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

export const MEETING_BACKGROUND_FORMATS: Record<
  MeetingBackgroundFormatId,
  MeetingBackgroundFormat
> = {
  /** Zoom / Teams recommended virtual background */
  hd: {
    id: "hd",
    aspect: "aspect-[16/9]",
    labelKey: "formatHd",
    exportWidthPx: 1920,
    exportHeightPx: 1080,
    filenameStem: "meeting-background-hd",
  },
  /** High-DPI / large display virtual background */
  uhd: {
    id: "uhd",
    aspect: "aspect-[16/9]",
    labelKey: "formatUhd",
    exportWidthPx: 3840,
    exportHeightPx: 2160,
    filenameStem: "meeting-background-uhd",
  },
};

const FORMAT_ORDER: readonly MeetingBackgroundFormatId[] = ["hd", "uhd"];

export function meetingBackgroundFormats(): readonly MeetingBackgroundFormat[] {
  return FORMAT_ORDER.map((id) => MEETING_BACKGROUND_FORMATS[id]);
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
