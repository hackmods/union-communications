import {
  printPageExportPixelRatio,
  printPagePreviewHeightPx,
  printPagePreviewWidthPx,
  type PrintPagePreviewSpec,
} from "@/lib/comms/print-page-formats";

export type OrgChartFormatId =
  | "letter"
  | "letter-landscape"
  | "tabloid"
  | "tabloid-landscape";

export type OrgChartFormatLabelKey =
  | "formatLetter"
  | "formatLetterLandscape"
  | "formatTabloid"
  | "formatTabloidLandscape";

/**
 * poster — executive / steward / committee card bands
 * list — Position | Name table (no campus column)
 * list-location — Position | Name | Location (campus codes), Local-243-style sheet
 */
export type OrgChartLayoutId = "poster" | "list" | "list-location";

export type OrgChartLayoutLabelKey =
  | "layoutPoster"
  | "layoutList"
  | "layoutListLocation";

export interface OrgChartFormat extends PrintPagePreviewSpec {
  id: OrgChartFormatId;
  aspect: string;
  labelKey: OrgChartFormatLabelKey;
  filenameStem: string;
}

export const DEFAULT_ORG_CHART_FORMAT: OrgChartFormatId = "letter";

export const DEFAULT_ORG_CHART_LAYOUT: OrgChartLayoutId = "poster";

export const ORG_CHART_LAYOUT_ORDER: readonly OrgChartLayoutId[] = [
  "poster",
  "list",
  "list-location",
];

export function orgChartLayoutShowsLocation(
  layoutId: OrgChartLayoutId,
): boolean {
  return layoutId === "list-location";
}

export function isOrgChartListLayout(layoutId: OrgChartLayoutId): boolean {
  return layoutId === "list" || layoutId === "list-location";
}

/** Map legacy `directory` id from early builds onto list-location. */
export function coerceOrgChartLayoutId(
  value: string | null | undefined,
): OrgChartLayoutId {
  if (value === "list" || value === "list-location" || value === "poster") {
    return value;
  }
  if (value === "directory") return "list-location";
  return DEFAULT_ORG_CHART_LAYOUT;
}

export const ORG_CHART_FORMAT_ORDER: readonly OrgChartFormatId[] = [
  "letter",
  "letter-landscape",
  "tabloid",
  "tabloid-landscape",
];

export const ORG_CHART_FORMATS: Record<OrgChartFormatId, OrgChartFormat> = {
  letter: {
    id: "letter",
    aspect: "aspect-[8.5/11]",
    labelKey: "formatLetter",
    widthInches: 8.5,
    heightInches: 11,
    previewWidthPx: printPagePreviewWidthPx(8.5),
    filenameStem: "org-chart-letter",
  },
  "letter-landscape": {
    id: "letter-landscape",
    aspect: "aspect-[11/8.5]",
    labelKey: "formatLetterLandscape",
    widthInches: 11,
    heightInches: 8.5,
    previewWidthPx: printPagePreviewWidthPx(11),
    filenameStem: "org-chart-letter-landscape",
  },
  tabloid: {
    id: "tabloid",
    aspect: "aspect-[11/17]",
    labelKey: "formatTabloid",
    widthInches: 11,
    heightInches: 17,
    previewWidthPx: printPagePreviewWidthPx(11),
    filenameStem: "org-chart-tabloid",
  },
  "tabloid-landscape": {
    id: "tabloid-landscape",
    aspect: "aspect-[17/11]",
    labelKey: "formatTabloidLandscape",
    widthInches: 17,
    heightInches: 11,
    previewWidthPx: printPagePreviewWidthPx(17),
    filenameStem: "org-chart-tabloid-landscape",
  },
};

export function isPortraitOrgChartFormat(id: OrgChartFormatId): boolean {
  return id === "letter" || id === "tabloid";
}

export const orgChartPreviewHeightPx = printPagePreviewHeightPx;

export const orgChartExportPixelRatio = printPageExportPixelRatio;
