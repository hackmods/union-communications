import { blendHex } from "@/lib/utils/contrast";
import { colorsFromUnionPreset, type UnionBranding } from "@/lib/constants/unionPresets";
import type { BrandKit, BrandKitPatch, SavedBrandLook } from "@/types/entities";

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
    id, name: name.trim().slice(0, 60), unionPresetId: kit.unionPresetId,
    primaryColor: kit.primaryColor, secondaryColor: kit.secondaryColor,
    accentColor: kit.accentColor, useOfficialLogo: kit.useOfficialLogo,
    officialLogoVariant: kit.officialLogoVariant,
    identityPackId: kit.identityPackId, campaignPlate: kit.campaignPlate,
    customLogoDataUrl: kit.customLogoDataUrl, logoText: kit.logoText,
  };
}

export function applySavedLook(look: SavedBrandLook): BrandKitPatch {
  return {
    primaryColor: look.primaryColor, secondaryColor: look.secondaryColor,
    accentColor: look.accentColor, useOfficialLogo: look.useOfficialLogo,
    officialLogoVariant: look.officialLogoVariant,
    identityPackId: look.identityPackId, campaignPlate: look.campaignPlate,
    customLogoDataUrl: look.customLogoDataUrl, logoText: look.logoText,
  };
}
