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

export type OrgChartLayoutId = "poster" | "directory";

export interface OrgChartFormat {
  id: OrgChartFormatId;
  aspect: string;
  labelKey: OrgChartFormatLabelKey;
  widthInches: number;
  heightInches: number;
  filenameStem: string;
}

export const DEFAULT_ORG_CHART_FORMAT: OrgChartFormatId = "letter";

export const DEFAULT_ORG_CHART_LAYOUT: OrgChartLayoutId = "poster";

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
    filenameStem: "org-chart-letter",
  },
  "letter-landscape": {
    id: "letter-landscape",
    aspect: "aspect-[11/8.5]",
    labelKey: "formatLetterLandscape",
    widthInches: 11,
    heightInches: 8.5,
    filenameStem: "org-chart-letter-landscape",
  },
  tabloid: {
    id: "tabloid",
    aspect: "aspect-[11/17]",
    labelKey: "formatTabloid",
    widthInches: 11,
    heightInches: 17,
    filenameStem: "org-chart-tabloid",
  },
  "tabloid-landscape": {
    id: "tabloid-landscape",
    aspect: "aspect-[17/11]",
    labelKey: "formatTabloidLandscape",
    widthInches: 17,
    heightInches: 11,
    filenameStem: "org-chart-tabloid-landscape",
  },
};

export function isPortraitOrgChartFormat(id: OrgChartFormatId): boolean {
  return id === "letter" || id === "tabloid";
}
