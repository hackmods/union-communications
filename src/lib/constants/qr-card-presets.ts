export type QrCardPresetId =
  | "getSupport"
  | "esa"
  | "ohsa"
  | "healthSafety"
  | "followUs"
  | "localWebsite"
  | "joinUnion"
  | "joinFullTime"
  | "joinPartTime";

export type QrCardBgMode = "plain" | "gradient" | "accentBar";

export interface QrCardPreset {
  id: QrCardPresetId;
  /** Default destination - empty means use window.origin at runtime */
  defaultUrl: string;
  /** i18n keys under qrCard.presets.* */
  titleKey: string;
  descriptionKey: string;
  taglineKey: string;
  bgMode: QrCardBgMode;
}

export const QR_CARD_PRESETS: readonly QrCardPreset[] = [
  {
    id: "getSupport",
    defaultUrl: "",
    titleKey: "getSupportTitle",
    descriptionKey: "getSupportDesc",
    taglineKey: "getSupportTagline",
    bgMode: "gradient",
  },
  {
    id: "joinUnion",
    defaultUrl: "",
    titleKey: "joinUnionTitle",
    descriptionKey: "joinUnionDesc",
    taglineKey: "joinUnionTagline",
    bgMode: "accentBar",
  },
  {
    id: "joinFullTime",
    defaultUrl: "",
    titleKey: "joinFullTimeTitle",
    descriptionKey: "joinFullTimeDesc",
    taglineKey: "joinFullTimeTagline",
    bgMode: "plain",
  },
  {
    id: "joinPartTime",
    defaultUrl: "",
    titleKey: "joinPartTimeTitle",
    descriptionKey: "joinPartTimeDesc",
    taglineKey: "joinPartTimeTagline",
    bgMode: "plain",
  },
  {
    id: "esa",
    defaultUrl:
      "https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees",
    titleKey: "esaTitle",
    descriptionKey: "esaDesc",
    taglineKey: "esaTagline",
    bgMode: "plain",
  },
  {
    id: "ohsa",
    defaultUrl:
      "https://www.ontario.ca/document/guide-occupational-health-and-safety-act",
    titleKey: "ohsaTitle",
    descriptionKey: "ohsaDesc",
    taglineKey: "ohsaTagline",
    bgMode: "accentBar",
  },
  {
    id: "healthSafety",
    defaultUrl: "",
    titleKey: "healthSafetyTitle",
    descriptionKey: "healthSafetyDesc",
    taglineKey: "healthSafetyTagline",
    bgMode: "plain",
  },
  {
    id: "followUs",
    defaultUrl: "",
    titleKey: "followUsTitle",
    descriptionKey: "followUsDesc",
    taglineKey: "followUsTagline",
    bgMode: "gradient",
  },
  {
    id: "localWebsite",
    defaultUrl: "",
    titleKey: "localWebsiteTitle",
    descriptionKey: "localWebsiteDesc",
    taglineKey: "localWebsiteTagline",
    bgMode: "accentBar",
  },
] as const;

export function getQrCardPreset(id: string): QrCardPreset | undefined {
  return QR_CARD_PRESETS.find((p) => p.id === id);
}
