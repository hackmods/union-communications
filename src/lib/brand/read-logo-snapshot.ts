import { BRAND_KIT_KEY, LEGACY_BRAND_KIT_KEY } from "@/lib/data/adapter";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import type { BrandKit } from "@/types/entities";

export type BrandLogoSnapshot = Pick<
  BrandKit,
  | "useOfficialLogo"
  | "officialLogoVariant"
  | "customLogoDataUrl"
  | "identityPackId"
  | "unionPresetId"
  | "campaignPlate"
  | "primaryColor"
  | "secondaryColor"
>;

function readRawBrandKitJson(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.localStorage.getItem(BRAND_KIT_KEY) ??
      window.localStorage.getItem(LEGACY_BRAND_KIT_KEY)
    );
  } catch {
    return null;
  }
}

/** Synchronous logo fields from localStorage — mirrors BrandChromeInitScript read path. */
export function readBrandKitLogoSnapshot(): BrandLogoSnapshot | null {
  const raw = readRawBrandKitJson();
  if (!raw) return null;
  try {
    const kit = normalizeBrandKit(JSON.parse(raw) as object);
    return {
      useOfficialLogo: kit.useOfficialLogo,
      officialLogoVariant: kit.officialLogoVariant,
      customLogoDataUrl: kit.customLogoDataUrl,
      identityPackId: kit.identityPackId,
      unionPresetId: kit.unionPresetId,
      campaignPlate: kit.campaignPlate,
      primaryColor: kit.primaryColor,
      secondaryColor: kit.secondaryColor,
    };
  } catch {
    return null;
  }
}
