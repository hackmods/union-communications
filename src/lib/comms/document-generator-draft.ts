import type { OfficePresetId } from "@/lib/constants/office-templates";
import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";
import type { CanvasTypeScale } from "@/types/entities";

export const DOCUMENT_GENERATOR_STORAGE_KEY =
  "unionops-document-generator-draft-v1";

/** Letter / office print chrome shared across presets. */
export type OfficeHeaderSizePreset = "compact" | "standard" | "display";
export type OfficeTopMarginPreset = "tight" | "standard" | "roomy";
export type OfficeLetterSpacingPreset = "tight" | "normal" | "loose";

export type DocumentGeneratorDraft = {
  presetId: OfficePresetId;
  includeDocx: boolean;
  includeXlsx: boolean;
  includePptx: boolean;
  includeIcs: boolean;
  includeLogo: boolean;
  /** Single QR on letters — default on when Brand Kit has a destination. */
  showQr: boolean;
  /** Brand Kit link id from listSavedLinks / membership destinations. */
  qrLinkId: string;
  salutationPresetId: string;
  topMargin: OfficeTopMarginPreset;
  letterSpacing: OfficeLetterSpacingPreset;
  headerSize: OfficeHeaderSizePreset;
  /** Optional tool-local type scale for preview (Brand Kit remains source of truth). */
  typeScaleOverride: CanvasTypeScale | "inherit";
  fields: Record<string, string>;
};

export const LETTER_PRESET_IDS: readonly OfficePresetId[] = [
  "simple-letter",
  "welcome-letter",
  "letterhead",
] as const;

const LETTER_PRESETS = LETTER_PRESET_IDS;

export const LETTER_SHARED_FIELD_KEYS = [
  "contactName",
  "stewardName",
  "presidentName",
  "salutation",
] as const;

export function isLetterPreset(id: OfficePresetId): boolean {
  return LETTER_PRESETS.includes(id);
}

export function isDocumentGeneratorDraft(v: unknown): v is DocumentGeneratorDraft {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.presetId === "string" &&
    typeof o.fields === "object" &&
    o.fields !== null &&
    typeof o.includeDocx === "boolean"
  );
}

export function loadDocumentGeneratorDraft(): DocumentGeneratorDraft | null {
  return loadJsonDraft(DOCUMENT_GENERATOR_STORAGE_KEY, isDocumentGeneratorDraft);
}

export function saveDocumentGeneratorDraft(
  draft: DocumentGeneratorDraft,
): boolean {
  return saveJsonDraft(DOCUMENT_GENERATOR_STORAGE_KEY, draft);
}

export function clearDocumentGeneratorDraft(): boolean {
  return clearJsonDraft(DOCUMENT_GENERATOR_STORAGE_KEY);
}

/** Merge shared letterhead chrome when switching letter presets. */
export function mergeLetterSharedFields(
  nextFields: Record<string, string>,
  prevFields: Record<string, string>,
  nextPresetId: OfficePresetId,
  prevPresetId: OfficePresetId,
): Record<string, string> {
  if (!isLetterPreset(nextPresetId) || !isLetterPreset(prevPresetId)) {
    return nextFields;
  }
  const merged = { ...nextFields };
  for (const key of LETTER_SHARED_FIELD_KEYS) {
    const prev = prevFields[key]?.trim();
    if (prev) merged[key] = prev;
  }
  return merged;
}

export const SALUTATION_PRESET_IDS = [
  "dearMember",
  "dearNewMember",
  "dearColleague",
  "toWhom",
  "custom",
] as const;

export type SalutationPresetId = (typeof SALUTATION_PRESET_IDS)[number];

export function resolveSalutationLine(
  fields: Record<string, string>,
  presetId: string,
): string {
  const custom = fields.salutation?.trim();
  if (presetId === "custom" && custom) return custom.endsWith(",") ? custom : `${custom},`;
  if (custom) return custom.endsWith(",") ? custom : `${custom},`;
  const member = fields.memberName?.trim() || "Member";
  switch (presetId) {
    case "dearNewMember":
      return "Dear New Member!";
    case "dearColleague":
      return "Dear Colleague,";
    case "toWhom":
      return "To whom it may concern,";
    case "dearMember":
    default:
      return `Dear ${member},`;
  }
}

/** Word half-points (docx `size`) for letterhead local label. */
export function headerLocalSizeHalfPoints(
  preset: OfficeHeaderSizePreset,
): number {
  if (preset === "compact") return 24;
  if (preset === "display") return 36;
  return 28;
}

export function headerContactSizeHalfPoints(
  preset: OfficeHeaderSizePreset,
): number {
  if (preset === "compact") return 18;
  if (preset === "display") return 24;
  return 20;
}

/** Page top margin in twips (1440 = 1"). */
export function topMarginTwips(preset: OfficeTopMarginPreset): number {
  if (preset === "tight") return 576; // 0.4"
  if (preset === "roomy") return 1080; // 0.75"
  return 720; // 0.5"
}

/** CSS letter-spacing for preview; DOCX character spacing in twentieths of a point. */
export function letterSpacingCss(preset: OfficeLetterSpacingPreset): string {
  if (preset === "tight") return "-0.01em";
  if (preset === "loose") return "0.04em";
  return "0.01em";
}

export function letterSpacingTwentieths(
  preset: OfficeLetterSpacingPreset,
): number {
  if (preset === "tight") return -4;
  if (preset === "loose") return 16;
  return 4;
}
