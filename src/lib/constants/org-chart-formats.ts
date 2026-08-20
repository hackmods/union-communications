export type OrgChartFormatId = "letter" | "tabloid";

export type OrgChartFormatLabelKey = "formatLetter" | "formatTabloid";

export interface OrgChartFormat {
  id: OrgChartFormatId;
  aspect: string;
  labelKey: OrgChartFormatLabelKey;
  widthInches: number;
  heightInches: number;
  filenameStem: string;
}

export const DEFAULT_ORG_CHART_FORMAT: OrgChartFormatId = "letter";

export const ORG_CHART_FORMAT_ORDER: readonly OrgChartFormatId[] = [
  "letter",
  "tabloid",
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
  tabloid: {
    id: "tabloid",
    aspect: "aspect-[11/17]",
    labelKey: "formatTabloid",
    widthInches: 11,
    heightInches: 17,
    filenameStem: "org-chart-tabloid",
  },
};
