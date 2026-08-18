/**
 * Curated phone-editor comparison for `/guide/short-form`.
 * Names, pricing, and privacy copy live in `shortFormGuide` i18n.
 * No outbound product URLs — LINK-001; do not affiliate-link.
 */

export type ShortFormEditorId =
  | "device-native"
  | "inshot"
  | "canva"
  | "descript"
  | "capcut";

export type ShortFormPricingTier = "free" | "freemium" | "paid";

export type ShortFormPrivacyPosture =
  | "on-device"
  | "account-cloud"
  | "high-risk-cloud";

export type ShortFormUseCaseId =
  | "hook-still"
  | "captions-burn"
  | "voiceover"
  | "campaign-cta";

export interface ShortFormEditorMeta {
  id: ShortFormEditorId;
  pricing: ShortFormPricingTier;
  privacy: ShortFormPrivacyPosture;
  useCaseIds: readonly ShortFormUseCaseId[];
}

/** Native first; cloud / higher-risk editors last. */
export const SHORT_FORM_EDITORS: readonly ShortFormEditorMeta[] = [
  {
    id: "device-native",
    pricing: "free",
    privacy: "on-device",
    useCaseIds: ["hook-still", "captions-burn"],
  },
  {
    id: "inshot",
    pricing: "freemium",
    privacy: "on-device",
    useCaseIds: ["captions-burn", "voiceover"],
  },
  {
    id: "canva",
    pricing: "freemium",
    privacy: "account-cloud",
    useCaseIds: ["hook-still", "captions-burn"],
  },
  {
    id: "descript",
    pricing: "freemium",
    privacy: "account-cloud",
    useCaseIds: ["voiceover"],
  },
  {
    id: "capcut",
    pricing: "freemium",
    privacy: "high-risk-cloud",
    useCaseIds: ["captions-burn", "voiceover"],
  },
];

export const SHORT_FORM_USE_CASE_IDS: readonly ShortFormUseCaseId[] = [
  "hook-still",
  "captions-burn",
  "voiceover",
  "campaign-cta",
];
