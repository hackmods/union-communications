export type ResizerFormatId =
  | "facebookCover"
  | "facebookPost"
  | "instagramSquare"
  | "instagramStory"
  | "youtubeBanner"
  | "custom";

export type ResizerFormatLabelKey =
  | "formatFacebookCover"
  | "formatFacebookPost"
  | "formatInstagramSquare"
  | "formatInstagramStory"
  | "formatYoutubeBanner"
  | "formatCustom";

export interface ResizerFormat {
  id: ResizerFormatId;
  width: number;
  height: number;
  labelKey: ResizerFormatLabelKey;
  /** Filename stem before dimensions / extension */
  filenameStem: string;
}

/** Min/max inclusive bounds for custom W×H (CSS px at export). */
export const CUSTOM_SIZE_MIN = 64;
export const CUSTOM_SIZE_MAX = 4096;
export const DEFAULT_CUSTOM_WIDTH = 1080;
export const DEFAULT_CUSTOM_HEIGHT = 1080;
export const DEFAULT_RESIZER_FORMAT: ResizerFormatId = "instagramSquare";

export const RESIZER_FORMATS: Record<
  Exclude<ResizerFormatId, "custom">,
  Omit<ResizerFormat, "id"> & { id: Exclude<ResizerFormatId, "custom"> }
> = {
  facebookCover: {
    id: "facebookCover",
    width: 820,
    height: 312,
    labelKey: "formatFacebookCover",
    filenameStem: "facebookCover",
  },
  facebookPost: {
    id: "facebookPost",
    width: 1200,
    height: 630,
    labelKey: "formatFacebookPost",
    filenameStem: "facebookPost",
  },
  instagramSquare: {
    id: "instagramSquare",
    width: 1080,
    height: 1080,
    labelKey: "formatInstagramSquare",
    filenameStem: "instagramSquare",
  },
  instagramStory: {
    id: "instagramStory",
    width: 1080,
    height: 1920,
    labelKey: "formatInstagramStory",
    filenameStem: "instagramStory",
  },
  youtubeBanner: {
    id: "youtubeBanner",
    width: 2560,
    height: 1440,
    labelKey: "formatYoutubeBanner",
    filenameStem: "youtubeBanner",
  },
};

const PRESET_ORDER: readonly Exclude<ResizerFormatId, "custom">[] = [
  "facebookCover",
  "facebookPost",
  "instagramSquare",
  "instagramStory",
  "youtubeBanner",
];

/** Platform presets only (no custom). Used for ZIP of standard social sizes. */
export function platformResizerFormats(): readonly ResizerFormat[] {
  return PRESET_ORDER.map((id) => RESIZER_FORMATS[id]);
}

export function clampCustomSize(n: number): number {
  if (!Number.isFinite(n)) return CUSTOM_SIZE_MIN;
  return Math.min(CUSTOM_SIZE_MAX, Math.max(CUSTOM_SIZE_MIN, Math.round(n)));
}

export function resolveResizerFormat(
  id: ResizerFormatId,
  customWidth: number,
  customHeight: number,
): ResizerFormat {
  if (id === "custom") {
    const width = clampCustomSize(customWidth);
    const height = clampCustomSize(customHeight);
    return {
      id: "custom",
      width,
      height,
      labelKey: "formatCustom",
      filenameStem: "custom",
    };
  }
  return RESIZER_FORMATS[id];
}

/**
 * Scale live preview width so captured PNG matches catalog / custom pixels.
 * `offsetWidth * pixelRatio ≈ format.width`
 */
export function exportPixelRatio(
  node: HTMLElement | null,
  format: Pick<ResizerFormat, "width">,
): number {
  const target = format.width;
  const width = node?.offsetWidth ?? 0;
  if (target > 0 && width > 0) return target / width;
  return 2;
}

/**
 * Legacy map shape used by older call sites.
 * Prefer `RESIZER_FORMATS` / `resolveResizerFormat` for new code.
 */
export const PLATFORM_FORMATS = {
  facebookCover: {
    width: RESIZER_FORMATS.facebookCover.width,
    height: RESIZER_FORMATS.facebookCover.height,
    label: "Facebook Cover",
  },
  facebookPost: {
    width: RESIZER_FORMATS.facebookPost.width,
    height: RESIZER_FORMATS.facebookPost.height,
    label: "Facebook Post",
  },
  instagramSquare: {
    width: RESIZER_FORMATS.instagramSquare.width,
    height: RESIZER_FORMATS.instagramSquare.height,
    label: "Instagram Square",
  },
  instagramStory: {
    width: RESIZER_FORMATS.instagramStory.width,
    height: RESIZER_FORMATS.instagramStory.height,
    label: "Instagram Story",
  },
  youtubeBanner: {
    width: RESIZER_FORMATS.youtubeBanner.width,
    height: RESIZER_FORMATS.youtubeBanner.height,
    label: "YouTube Banner",
  },
} as const;
