import type { QrCardBgMode } from "@/lib/constants/qr-card-presets";

export type ActionCardPresetId =
  | "signPetition"
  | "supportCampaign"
  | "attendRally"
  | "writeOfficial"
  | "bargainingSupport"
  | "stopCuts";

export interface ActionCardPreset {
  id: ActionCardPresetId;
  /**
   * Empty by design — officers paste an external petition / ActionNetwork /
   * Google Form / national sign-on URL. Never collect signatures in-product.
   */
  defaultUrl: string;
  /** i18n keys under actionCard.presets.* */
  headlineKey: string;
  askKey: string;
  deadlineKey: string;
  ctaKey: string;
  bgMode: QrCardBgMode;
}

export const ACTION_CARD_PRESETS: readonly ActionCardPreset[] = [
  {
    id: "signPetition",
    defaultUrl: "",
    headlineKey: "signPetitionHeadline",
    askKey: "signPetitionAsk",
    deadlineKey: "signPetitionDeadline",
    ctaKey: "signPetitionCta",
    bgMode: "accentBar",
  },
  {
    id: "supportCampaign",
    defaultUrl: "",
    headlineKey: "supportCampaignHeadline",
    askKey: "supportCampaignAsk",
    deadlineKey: "supportCampaignDeadline",
    ctaKey: "supportCampaignCta",
    bgMode: "gradient",
  },
  {
    id: "attendRally",
    defaultUrl: "",
    headlineKey: "attendRallyHeadline",
    askKey: "attendRallyAsk",
    deadlineKey: "attendRallyDeadline",
    ctaKey: "attendRallyCta",
    bgMode: "plain",
  },
  {
    id: "writeOfficial",
    defaultUrl: "",
    headlineKey: "writeOfficialHeadline",
    askKey: "writeOfficialAsk",
    deadlineKey: "writeOfficialDeadline",
    ctaKey: "writeOfficialCta",
    bgMode: "accentBar",
  },
  {
    id: "bargainingSupport",
    defaultUrl: "",
    headlineKey: "bargainingSupportHeadline",
    askKey: "bargainingSupportAsk",
    deadlineKey: "bargainingSupportDeadline",
    ctaKey: "bargainingSupportCta",
    bgMode: "gradient",
  },
  {
    id: "stopCuts",
    defaultUrl: "",
    headlineKey: "stopCutsHeadline",
    askKey: "stopCutsAsk",
    deadlineKey: "stopCutsDeadline",
    ctaKey: "stopCutsCta",
    bgMode: "plain",
  },
] as const;

export function getActionCardPreset(id: string): ActionCardPreset | undefined {
  return ACTION_CARD_PRESETS.find((p) => p.id === id);
}
