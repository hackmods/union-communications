import { withTrailingSlash } from "@/lib/utils/internal-href";
import { OFFICE_PRESETS, type OfficePresetId } from "./office-templates";
import { LETTER_PRESET_IDS } from "@/lib/comms/document-generator-draft";

export function isOfficePresetId(value: string): value is OfficePresetId {
  return OFFICE_PRESETS.some((p) => p.id === value);
}

/** Resolve `?preset=` deep links for Document Generator (invalid → fallback). */
export function resolveOfficePresetFromQuery(
  raw: string | null | undefined,
  fallback: OfficePresetId = "simple-letter",
): OfficePresetId {
  if (raw && isOfficePresetId(raw)) return raw;
  return fallback;
}

/** Internal href for guide/tool CTAs — trailing slash before query (App Router safe). */
export function documentGeneratorPresetHref(presetId: OfficePresetId): string {
  return withTrailingSlash(`/tools/document-generator?preset=${presetId}`);
}

/** Letter Generator route with optional letter preset deep link. */
export function letterGeneratorPresetHref(
  presetId: (typeof LETTER_PRESET_IDS)[number] = "simple-letter",
): string {
  return withTrailingSlash(`/tools/letter-generator?preset=${presetId}`);
}
