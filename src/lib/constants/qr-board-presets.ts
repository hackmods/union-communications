import type { BrandKit } from "@/types/entities";
import { resolvePresetDestination } from "@/lib/utils/local-links";

export type QrBoardPresetId =
  | "membershipFtPt"
  | "twoCampaigns"
  | "coreLinks"
  | "fullBoard";

export const QR_BOARD_MIN_SLOTS = 2;
export const QR_BOARD_MAX_SLOTS = 8;

const ESA_GUIDE_URL =
  "https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees";
const OHSA_GUIDE_URL =
  "https://www.ontario.ca/document/guide-occupational-health-and-safety-act";

/** Slot template: destination from qr-card preset id or a fixed URL. */
export interface QrBoardSlotTemplate {
  /** i18n key under qrBoard.slotTitles.* */
  titleKey: string;
  /** qr-card preset id for Brand Kit resolve, or fixed URL when `fixedUrl` set */
  resolveId: string;
  fixedUrl?: string;
}

export interface QrBoardPreset {
  id: QrBoardPresetId;
  /** i18n keys under qrBoard.presets.* */
  labelKey: string;
  titleKey: string;
  subtitleKey: string;
  slots: readonly QrBoardSlotTemplate[];
}

export interface QrBoardSlotDraft {
  id: string;
  title: string;
  destination: string;
}

export const QR_BOARD_PRESETS: readonly QrBoardPreset[] = [
  {
    id: "membershipFtPt",
    labelKey: "membershipFtPtLabel",
    titleKey: "membershipFtPtTitle",
    subtitleKey: "membershipFtPtSubtitle",
    slots: [
      { titleKey: "membershipFullTime", resolveId: "membership-full-time" },
      { titleKey: "membershipPartTime", resolveId: "membership-part-time" },
    ],
  },
  {
    id: "twoCampaigns",
    labelKey: "twoCampaignsLabel",
    titleKey: "twoCampaignsTitle",
    subtitleKey: "twoCampaignsSubtitle",
    slots: [
      { titleKey: "unionCard", resolveId: "getSupport" },
      { titleKey: "collectiveAgreement", resolveId: "localWebsite" },
    ],
  },
  {
    id: "coreLinks",
    labelKey: "coreLinksLabel",
    titleKey: "coreLinksTitle",
    subtitleKey: "coreLinksSubtitle",
    slots: [
      { titleKey: "getSupport", resolveId: "getSupport" },
      { titleKey: "localWebsite", resolveId: "localWebsite" },
      { titleKey: "followUs", resolveId: "followUs" },
      { titleKey: "healthSafety", resolveId: "healthSafety" },
    ],
  },
  {
    id: "fullBoard",
    labelKey: "fullBoardLabel",
    titleKey: "fullBoardTitle",
    subtitleKey: "fullBoardSubtitle",
    slots: [
      { titleKey: "getSupport", resolveId: "getSupport" },
      { titleKey: "localWebsite", resolveId: "localWebsite" },
      { titleKey: "followUs", resolveId: "followUs" },
      { titleKey: "healthSafety", resolveId: "healthSafety" },
      {
        titleKey: "esa",
        resolveId: "esa",
        fixedUrl: ESA_GUIDE_URL,
      },
      {
        titleKey: "ohsa",
        resolveId: "ohsa",
        fixedUrl: OHSA_GUIDE_URL,
      },
    ],
  },
] as const;

export function getQrBoardPreset(id: string): QrBoardPreset | undefined {
  return QR_BOARD_PRESETS.find((p) => p.id === id);
}

export function clampQrBoardSlotCount(count: number): number {
  return Math.max(
    QR_BOARD_MIN_SLOTS,
    Math.min(QR_BOARD_MAX_SLOTS, Math.floor(count)),
  );
}

export function newQrBoardSlotId(): string {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveSlotDestination(
  template: QrBoardSlotTemplate,
  kit: BrandKit,
  originFallback: string,
): string {
  const fixed = template.fixedUrl?.trim();
  if (fixed) return fixed;
  return resolvePresetDestination(template.resolveId, kit, originFallback);
}

/** Build slot drafts from a board preset (caller supplies localized titles). */
export function buildSlotsFromPreset(
  preset: QrBoardPreset,
  kit: BrandKit,
  originFallback: string,
  titleFor: (titleKey: string) => string,
): QrBoardSlotDraft[] {
  return preset.slots.map((slot) => ({
    id: newQrBoardSlotId(),
    title: titleFor(slot.titleKey),
    destination: resolveSlotDestination(slot, kit, originFallback),
  }));
}
