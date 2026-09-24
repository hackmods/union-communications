import {
  OFFICE_PRESETS,
  defaultFieldsForPreset,
  getPreset,
  type OfficePresetId,
} from "@/lib/constants/office-templates";
import type { BrandKit } from "@/types/entities";
import {
  type DocumentGeneratorDraft,
  type OfficeHeaderSizePreset,
  type OfficeLetterSpacingPreset,
  type OfficeTopMarginPreset,
  headerContactSizeHalfPoints,
  headerLocalSizeHalfPoints,
  letterSpacingTwentieths,
  loadDocumentGeneratorDraft,
  mergeLetterSharedFields,
  resolveSalutationLine,
  topMarginTwips,
} from "@/lib/comms/document-generator-draft";
import { listSavedLinks } from "@/lib/utils/local-links";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";

export type GeneratorState = DocumentGeneratorDraft;

export function createInitialGeneratorState(
  presetId: OfficePresetId = "simple-letter",
  includeLogo = false,
  brandKit?: BrandKit,
): GeneratorState {
  const preset = getPreset(presetId);
  const fields = defaultFieldsForPreset(preset);
  if (brandKit?.signatureName?.trim()) {
    if ("stewardName" in fields) fields.stewardName = brandKit.signatureName;
    if ("presidentName" in fields) fields.presidentName = brandKit.signatureName;
    if ("contactName" in fields && !fields.contactName?.trim()) {
      fields.contactName = brandKit.signatureName;
    }
  }
  const links = brandKit ? listSavedLinks(brandKit) : [];
  return {
    presetId,
    includeDocx: true,
    includeXlsx: preset.outputs.xlsx,
    includePptx: true,
    includeIcs: Boolean(preset.outputs.ics),
    includeLogo,
    showQr: links.length > 0,
    qrLinkId: links[0]?.id ?? "",
    salutationPresetId: presetId === "welcome-letter" ? "dearNewMember" : "dearMember",
    topMargin: "standard",
    letterSpacing: "normal",
    headerSize: "standard",
    typeScaleOverride: "inherit",
    fields,
  };
}

export function hydrateGeneratorState(
  presetFromQuery: OfficePresetId,
  brandKit: BrandKit,
  options?: { allowedPresets?: readonly OfficePresetId[] },
): GeneratorState {
  const allowed = options?.allowedPresets;
  const coercePreset = (id: OfficePresetId): OfficePresetId => {
    if (!allowed || allowed.includes(id)) return id;
    return allowed.includes(presetFromQuery) ? presetFromQuery : allowed[0]!;
  };

  const stored = loadDocumentGeneratorDraft();
  if (!stored) {
    return createInitialGeneratorState(
      coercePreset(presetFromQuery),
      false,
      brandKit,
    );
  }
  const rawPreset = OFFICE_PRESETS.some((p) => p.id === stored.presetId)
    ? stored.presetId
    : presetFromQuery;
  const validPreset = coercePreset(rawPreset);
  return {
    ...createInitialGeneratorState(validPreset, stored.includeLogo, brandKit),
    ...stored,
    presetId: validPreset,
    fields: {
      ...defaultFieldsForPreset(getPreset(validPreset)),
      ...stored.fields,
    },
  };
}

export function applyGeneratorPreset(
  prev: GeneratorState,
  id: OfficePresetId,
  brandKit: BrandKit,
  origin: string,
  resolveMembership: (kit: BrandKit, origin: string) => string,
): GeneratorState {
  const next = getPreset(id);
  let nextFields = defaultFieldsForPreset(next);
  nextFields = mergeLetterSharedFields(
    nextFields,
    prev.fields,
    id,
    prev.presetId,
  );
  if (id === "welcome-letter") {
    nextFields.collection =
      brandKit.local.subText?.trim() || nextFields.collection;
    nextFields.membershipUrl =
      resolveMembership(brandKit, origin) || nextFields.membershipUrl;
  }
  if (brandKit.signatureName?.trim()) {
    if ("stewardName" in nextFields && !nextFields.stewardName?.trim()) {
      nextFields.stewardName = brandKit.signatureName;
    }
  }
  return {
    ...prev,
    presetId: id,
    includeDocx: next.outputs.docx,
    includeXlsx: next.outputs.xlsx,
    includePptx: next.outputs.pptx,
    includeIcs: Boolean(next.outputs.ics),
    salutationPresetId:
      id === "welcome-letter" && prev.salutationPresetId === "dearMember"
        ? "dearNewMember"
        : prev.salutationPresetId,
    fields: nextFields,
  };
}

export function docxPrintChrome(state: GeneratorState): {
  salutationLine: string;
  headerLocalSize: number;
  headerContactSize: number;
  topMarginTwips: number;
  letterSpacingTwentieths: number;
} {
  return {
    salutationLine: resolveSalutationLine(
      state.fields,
      state.salutationPresetId,
    ),
    headerLocalSize: headerLocalSizeHalfPoints(state.headerSize),
    headerContactSize: headerContactSizeHalfPoints(state.headerSize),
    topMarginTwips: topMarginTwips(state.topMargin),
    letterSpacingTwentieths: letterSpacingTwentieths(state.letterSpacing),
  };
}

export function resolveQrLinkUrl(
  brandKit: BrandKit,
  qrLinkId: string,
): { url: string; label: string } | null {
  const links = listSavedLinks(brandKit);
  const hit = links.find((l) => l.id === qrLinkId) ?? links[0];
  if (!hit) return null;
  return { url: hit.url, label: hit.label };
}

export async function buildLetterQrBytes(
  brandKit: BrandKit,
  state: GeneratorState,
): Promise<{ qr: BrandLogoBytes; caption: string } | null> {
  if (!state.showQr) return null;
  const dest = resolveQrLinkUrl(brandKit, state.qrLinkId);
  if (!dest) return null;
  const { qrDataUrl } = await import("@/lib/export/qr");
  const dataUrl = await qrDataUrl(dest.url, { width: 192 });
  if (!dataUrl) return null;
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return {
    qr: {
      bytes: new Uint8Array(buf),
      extension: "png",
      widthPx: 192,
      heightPx: 192,
      src: dataUrl,
    },
    caption: dest.label,
  };
}

export type {
  OfficeHeaderSizePreset,
  OfficeLetterSpacingPreset,
  OfficeTopMarginPreset,
};
