import {
  OFFICE_PRESETS,
  defaultFieldsForPreset,
  getPreset,
  type OfficePresetId,
} from "@/lib/constants/office-templates";
import type { BrandKit } from "@/types/entities";
import { resolveDesignTreatment } from "@/lib/brand/design-treatment";
import {
  type DocumentGeneratorDraft,
  type OfficeHeaderSizePreset,
  type OfficeLetterSpacingPreset,
  type OfficeTopMarginPreset,
  headerContactSizeHalfPoints,
  headerLocalSizeHalfPoints,
  isLetterPreset,
  letterSpacingTwentieths,
  loadDocumentGeneratorDraft,
  mergeLetterSharedFields,
  resolveSalutationLine,
  topMarginTwips,
} from "@/lib/comms/document-generator-draft";
import { listSavedLinks } from "@/lib/utils/local-links";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";

export type GeneratorState = DocumentGeneratorDraft;

/** Seed letter / worksheet fields from Brand Kit identity + contact. */
export function applyBrandKitFieldSeeds(
  fields: Record<string, string>,
  brandKit?: BrandKit,
): Record<string, string> {
  if (!brandKit) return fields;
  const next = { ...fields };
  const name = brandKit.signatureName?.trim();
  const title = brandKit.signatureTitle?.trim();
  if (name) {
    if ("stewardName" in next) next.stewardName = name;
    if ("presidentName" in next) next.presidentName = name;
    if ("contactName" in next && !next.contactName?.trim()) {
      next.contactName = name;
    }
  }
  if (title) {
    next.signatureTitle = title;
    if ("stewardTitle" in next && !next.stewardTitle?.trim()) {
      next.stewardTitle = title;
    }
    if ("closingTitle" in next && !next.closingTitle?.trim()) {
      next.closingTitle = title;
    }
    // Letterhead / contact line often holds the committee name
    if ("contactName" in next && !next.contactName?.trim()) {
      next.contactName = title;
    }
  }
  if (brandKit.contactEmail?.trim() && "officeEmail" in next && !next.officeEmail?.trim()) {
    next.officeEmail = brandKit.contactEmail.trim();
  }
  if (brandKit.contactPhone?.trim() && "officePhone" in next && !next.officePhone?.trim()) {
    next.officePhone = brandKit.contactPhone.trim();
  }
  if (
    brandKit.contactAddress?.trim() &&
    "officeAddress" in next &&
    !next.officeAddress?.trim()
  ) {
    next.officeAddress = brandKit.contactAddress.trim();
  }
  // Letterhead contact line often uses contactName; prefer email when empty
  if (
    brandKit.contactEmail?.trim() &&
    "contactName" in next &&
    !next.contactName?.trim() &&
    !name
  ) {
    next.contactName = brandKit.contactEmail.trim();
  }
  return next;
}

export function createInitialGeneratorState(
  presetId: OfficePresetId = "simple-letter",
  includeLogo = false,
  brandKit?: BrandKit,
): GeneratorState {
  const preset = getPreset(presetId);
  const fields = applyBrandKitFieldSeeds(defaultFieldsForPreset(preset), brandKit);
  const links = brandKit ? listSavedLinks(brandKit) : [];
  return {
    treatment: brandKit ? resolveDesignTreatment(brandKit) : "full",
    presetId,
    includeDocx: true,
    includeXlsx: preset.outputs.xlsx,
    // Letters: Word is the printable artifact; PPTX is an optional short deck.
    includePptx: Boolean(preset.outputs.pptx) && !isLetterPreset(presetId),
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
  const base = createInitialGeneratorState(validPreset, stored.includeLogo, brandKit);
  return {
    ...base,
    ...stored,
    treatment: stored.treatment ?? "full",
    presetId: validPreset,
    // Letter route / letter presets: never inherit a full-generator PPTX toggle from shared draft.
    includePptx: isLetterPreset(validPreset)
      ? false
      : Boolean(stored.includePptx && getPreset(validPreset).outputs.pptx),
    includeDocx: Boolean(stored.includeDocx && getPreset(validPreset).outputs.docx),
    includeXlsx: Boolean(stored.includeXlsx && getPreset(validPreset).outputs.xlsx),
    includeIcs: Boolean(stored.includeIcs && getPreset(validPreset).outputs.ics),
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
  let nextFields = applyBrandKitFieldSeeds(defaultFieldsForPreset(next), brandKit);
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
    includePptx: Boolean(next.outputs.pptx) && !isLetterPreset(id),
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
