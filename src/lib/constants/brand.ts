import { getDefaultBrandDefaults } from "@/lib/tenant/loader";
import { resolveHostBrandDefaults } from "@/lib/constants/host-brand";
import { UNIONOPS_LOGOS } from "@/lib/constants/unionPresets";
import { DEFAULT_LOCAL_NUMBER } from "@/lib/utils/local";

const assetDefaults = getDefaultBrandDefaults();
const hostDefaults = resolveHostBrandDefaults();

/**
 * Instance brand palette from `config/host-brand.json` / `NEXT_PUBLIC_BRAND_*`.
 * Tenant-specific colours (e.g. OPSEU) live in seed data and `UNION_PRESETS`.
 */
export const BRAND_COLORS = {
  primary: hostDefaults.primaryColor,
  secondary: hostDefaults.secondaryColor,
  accent: hostDefaults.accentColor,
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
} as const;

/** @deprecated Use BRAND_COLORS - kept for gradual migration */
export const CAAT_OPSEU_COLORS = BRAND_COLORS;

export const DEFAULT_ASSET_PACK_PATH = assetDefaults.assetPackPath;

/** Bundled official logos for the reference tenant asset pack */
export const OFFICIAL_LOGOS = {
  lockup: {
    id: "lockup" as const,
    src: `${assetDefaults.assetPackPath}logo-primary.png`,
    aspect: "wide" as const,
    selectable: true as const,
  },
  mark: {
    id: "mark" as const,
    src: `${assetDefaults.assetPackPath}logo-mark.png`,
    /** White mark for dark / brand-coloured backgrounds */
    srcOnDark: `${assetDefaults.assetPackPath}logo-mark-white.png`,
    aspect: "square" as const,
    selectable: true as const,
  },
  /** Flip `selectable` to true when updated slit-mark graphics are ready */
  slitBlue: {
    id: "slitBlue" as const,
    src: `${assetDefaults.assetPackPath}opseu-mark-slit-blue.svg`,
    aspect: "square" as const,
    selectable: false as const,
  },
  /** Flip `selectable` to true when updated slit-mark graphics are ready */
  slitWhite: {
    id: "slitWhite" as const,
    src: `${assetDefaults.assetPackPath}opseu-mark-slit-white.svg`,
    aspect: "square" as const,
    /** Preview / use on dark backgrounds */
    onDark: true as const,
    selectable: false as const,
  },
} as const;

export type OfficialLogoVariant = keyof typeof OFFICIAL_LOGOS;

export function isOfficialLogoVariant(
  value: string | undefined,
): value is OfficialLogoVariant {
  return !!value && value in OFFICIAL_LOGOS;
}

/** Variants offered in Brand Kit / Logo Builder pickers */
export function isSelectableOfficialLogoVariant(
  value: string | undefined,
): value is OfficialLogoVariant {
  return (
    isOfficialLogoVariant(value) && OFFICIAL_LOGOS[value].selectable === true
  );
}

export const DEFAULT_BRAND_KIT = {
  version: "2.0" as const,
  unionId: undefined as string | undefined,
  unionName: undefined as string | undefined,
  divisionName: undefined as string | undefined,
  local: {
    id: "local-default",
    localNumber: hostDefaults.localNumber,
    subText: hostDefaults.subText,
    divisionId: hostDefaults.divisionId,
    bargainingUnitCode: undefined as string | undefined,
  },
  profiles: [
    {
      id: "profile-ft",
      label: "Full-time Support Staff",
      localNumber: hostDefaults.localNumber,
      subText: "Full-time Support Staff",
      bargainingUnitCode: "ft",
    },
    {
      id: "profile-pt",
      label: "Part-time Support Staff",
      localNumber: hostDefaults.localNumber,
      subText: "Part-time Support Staff",
      bargainingUnitCode: "pt",
    },
  ],
  activeProfileId: "profile-ft" as string | undefined,
  primaryColor: BRAND_COLORS.primary,
  secondaryColor: BRAND_COLORS.secondary,
  accentColor: BRAND_COLORS.accent,
  // First visit uses UnionOps mark; pick a union preset or upload for local branding
  useOfficialLogo: false,
  officialLogoVariant: "lockup" as OfficialLogoVariant,
  customLogoDataUrl: UNIONOPS_LOGOS.mark,
  logoText: "UO",
  unionPresetId: undefined as string | undefined,
  divisionId: hostDefaults.divisionId,
  websiteUrl: undefined as string | undefined,
  facebookUrl: undefined as string | undefined,
  customLinks: [] as { id: string; label: string; url: string }[],
  updatedAt: new Date().toISOString(),
};

/** @deprecated Prefer `@/lib/constants/resizer-formats`. Re-exported for compatibility. */
export { PLATFORM_FORMATS } from "@/lib/constants/resizer-formats";

export const MAX_UPLOAD_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

export { DEFAULT_LOCAL_NUMBER };
