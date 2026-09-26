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

/** Demo placeholders that should yield to Brand Kit seeds. */
const FIELD_PLACEHOLDERS = new Set(
  [
    "Steward name",
    "Chief steward",
    "Local executive committee",
    "Local executive",
    "Local president",
    "steward@example.org",
    "Member name",
  ].map((s) => s.toLowerCase()),
);

function isUnsetOrPlaceholder(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return true;
  return FIELD_PLACEHOLDERS.has(trimmed.toLowerCase());
}

function setIfUnset(
  fields: Record<string, string>,
  key: string,
  value: string | undefined,
  force = false,
): void {
  if (!value?.trim()) return;
  if (!(key in fields) && !force) return;
  if (force || isUnsetOrPlaceholder(fields[key])) {
    fields[key] = value.trim();
  }
}

/**
 * Seed letter / worksheet fields from Brand Kit identity + contact.
 * Existing non-placeholder values win unless `overwriteNames` is set
 * (used on first open so Brand Kit signature replaces demo "Steward name").
 */
export function applyBrandKitFieldSeeds(
  fields: Record<string, string>,
  brandKit?: BrandKit,
  options?: { overwriteNames?: boolean },
): Record<string, string> {
  if (!brandKit) return fields;
  const next = { ...fields };
  const overwriteNames = options?.overwriteNames === true;
  const name = brandKit.signatureName?.trim();
  const title = brandKit.signatureTitle?.trim();
  const email = brandKit.contactEmail?.trim();
  const phone = brandKit.contactPhone?.trim();
  const address = brandKit.contactAddress?.trim();

  if (name) {
    setIfUnset(next, "stewardName", name, overwriteNames);
    setIfUnset(next, "presidentName", name, overwriteNames);
    setIfUnset(next, "contactName", name);
  }
  if (title) {
    next.signatureTitle = overwriteNames || isUnsetOrPlaceholder(next.signatureTitle)
      ? title
      : next.signatureTitle ?? title;
    setIfUnset(next, "contactName", title);
  }
  setIfUnset(next, "officeEmail", email);
  setIfUnset(next, "officePhone", phone);
  setIfUnset(next, "officeAddress", address);
  if (email || phone) {
    const contactLine = [email, phone].filter(Boolean).join(" · ");
    setIfUnset(next, "stewardContact", contactLine);
  }
  // Compose letterhead contact from office lines when still empty
  if (isUnsetOrPlaceholder(next.contactName)) {
    const composed = [title, email, phone, address].filter(Boolean).join(" · ");
    if (composed) next.contactName = composed;
  }
  return next;
}

export function createInitialGeneratorState(
  presetId: OfficePresetId = "simple-letter",
  includeLogo = false,
  brandKit?: BrandKit,
): GeneratorState {
  const preset = getPreset(presetId);
  const fields = applyBrandKitFieldSeeds(defaultFieldsForPreset(preset), brandKit, {
    overwriteNames: true,
  });
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
  const mergedFields = applyBrandKitFieldSeeds(
    {
      ...defaultFieldsForPreset(getPreset(validPreset)),
      ...stored.fields,
    },
    brandKit,
  );
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
    fields: mergedFields,
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
  let nextFields = applyBrandKitFieldSeeds(defaultFieldsForPreset(next), brandKit, {
    overwriteNames: true,
  });
  nextFields = mergeLetterSharedFields(
    nextFields,
    prev.fields,
    id,
    prev.presetId,
  );
  // Re-fill Brand Kit seeds into any still-empty shared slots after merge
  nextFields = applyBrandKitFieldSeeds(nextFields, brandKit);
  if (id === "welcome-letter") {
    nextFields.collection =
      brandKit.local.subText?.trim() || nextFields.collection;
    nextFields.membershipUrl =
      resolveMembership(brandKit, origin) || nextFields.membershipUrl;
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

