import { blendHex } from "@/lib/utils/contrast";
import { colorsFromUnionPreset, type UnionBranding } from "@/lib/constants/unionPresets";
import { isDesignTreatment } from "@/lib/brand/design-treatment";
import type { BrandKit, BrandKitPatch, SavedBrandLook } from "@/types/entities";

export const SAVED_LOOKS_MAX = 12;
/** Safety bound when parsing stored kits (presets × per-preset cap). */
export const SAVED_LOOKS_PARSE_MAX = SAVED_LOOKS_MAX * 16;

export function starterPaletteVariants(preset: UnionBranding) {
  const core = colorsFromUnionPreset(preset);
  return [
    { id: "core", colors: core },
    {
      id: "deep",
      colors: {
        primaryColor: blendHex("#000000", core.primaryColor, 0.22),
        secondaryColor: "#FFFFFF",
        accentColor: core.primaryColor,
      },
    },
  ] as const;
}

export function captureSavedLook(kit: BrandKit, id: string, name: string): SavedBrandLook {
  return {
    id,
    name: name.trim().slice(0, 60),
    unionPresetId: kit.unionPresetId,
    primaryColor: kit.primaryColor,
    secondaryColor: kit.secondaryColor,
    accentColor: kit.accentColor,
    designTreatment: kit.designTreatment,
    useOfficialLogo: kit.useOfficialLogo,
    officialLogoVariant: kit.officialLogoVariant,
    identityPackId: kit.identityPackId,
    campaignPlate: kit.campaignPlate,
    customLogoDataUrl: kit.customLogoDataUrl,
    logoText: kit.logoText,
  };
}

export function applySavedLook(look: SavedBrandLook): BrandKitPatch {
  const patch: BrandKitPatch = {
    primaryColor: look.primaryColor,
    secondaryColor: look.secondaryColor,
    accentColor: look.accentColor,
    useOfficialLogo: look.useOfficialLogo,
    officialLogoVariant: look.officialLogoVariant,
    identityPackId: look.identityPackId,
    campaignPlate: look.campaignPlate,
    customLogoDataUrl: look.customLogoDataUrl,
    logoText: look.logoText,
  };
  if (isDesignTreatment(look.designTreatment)) {
    patch.designTreatment = look.designTreatment;
  }
  return patch;
}

/** Keep up to SAVED_LOOKS_MAX Looks for each unionPresetId bucket. */
export function capSavedLooksPerPreset(
  looks: SavedBrandLook[],
): SavedBrandLook[] {
  const byPreset = new Map<string, SavedBrandLook[]>();
  for (const look of looks) {
    const key = look.unionPresetId ?? "";
    const list = byPreset.get(key) ?? [];
    if (list.length < SAVED_LOOKS_MAX) list.push(look);
    byPreset.set(key, list);
  }
  return [...byPreset.values()].flat();
}
