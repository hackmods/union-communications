import { resolveLocalNumber } from "@/lib/utils/local";
import type { BrandKit } from "@/types/entities";
import {
  BYLAW_PRESETS,
  defaultArticleSetForPreset,
  type BylawDraft,
  type BylawFormValues,
  type BylawPresetId,
} from "./build-template";

type BrandContext = Pick<BrandKit, "unionName" | "unionPresetId" | "local">;

/** Apply a preset and optionally merge Brand Kit local identity. */
export function applyBylawPreset(
  presetId: BylawPresetId,
  brandKit?: BrandContext | null,
): Pick<BylawDraft, keyof BylawFormValues | "articleSet"> {
  const base = { ...BYLAW_PRESETS[presetId] };
  const articleSet = defaultArticleSetForPreset(presetId);
  const localNumber = brandKit?.local?.localNumber ?? "";

  if (
    brandKit?.unionPresetId === "opseu" ||
    presetId === "opseuCaat" ||
    presetId === "campus" ||
    presetId === "small"
  ) {
    const localNum = resolveLocalNumber(localNumber);
    if (localNum) {
      base.localName = `OPSEU / SEFPO Local ${localNum}`;
    }
  } else if (brandKit?.unionName?.trim() && localNumber.trim()) {
    base.localName = `${brandKit.unionName.trim()} Local ${localNumber.trim()}`;
  }

  return { ...base, articleSet };
}
