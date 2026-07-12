import { getDefaultBrandDefaults } from "@/lib/tenant/loader";
import { PLATFORM_UNION_ORANGE } from "@/lib/constants/unionPresets";
import { DEFAULT_LOCAL_NUMBER } from "@/lib/utils/local";

const defaults = getDefaultBrandDefaults();

/**
 * Platform-neutral brand palette (generic bright orange).
 * Tenant-specific colours (e.g. OPSEU) live in seed data and `UNION_PRESETS`.
 */
export const BRAND_COLORS = {
  primary: PLATFORM_UNION_ORANGE.primary,
  secondary: PLATFORM_UNION_ORANGE.secondary,
  accent: PLATFORM_UNION_ORANGE.accent,
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
} as const;

/** @deprecated Use BRAND_COLORS - kept for gradual migration */
export const CAAT_OPSEU_COLORS = BRAND_COLORS;

export const DEFAULT_ASSET_PACK_PATH = defaults.assetPackPath;

/** Bundled official logos for the reference tenant asset pack */
export const OFFICIAL_LOGOS = {
  lockup: {
    id: "lockup" as const,
    src: `${defaults.assetPackPath}logo-primary.png`,
    aspect: "wide" as const,
    selectable: true as const,
  },
  mark: {
    id: "mark" as const,
    src: `${defaults.assetPackPath}logo-mark.png`,
    /** White mark for dark / brand-coloured backgrounds */
    srcOnDark: `${defaults.assetPackPath}logo-mark-white.png`,
    aspect: "square" as const,
    selectable: true as const,
  },
  /** Flip `selectable` to true when updated slit-mark graphics are ready */
  slitBlue: {
    id: "slitBlue" as const,
    src: `${defaults.assetPackPath}opseu-mark-slit-blue.svg`,
    aspect: "square" as const,
    selectable: false as const,
  },
  /** Flip `selectable` to true when updated slit-mark graphics are ready */
  slitWhite: {
    id: "slitWhite" as const,
    src: `${defaults.assetPackPath}opseu-mark-slit-white.svg`,
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
  version: "1.1" as const,
  local: {
    id: "local-default",
    localNumber: "",
    subText: "Support Staff",
    divisionId: defaults.assetPackPath.includes("caat") ? "caat" : undefined,
  },
  primaryColor: BRAND_COLORS.primary,
  secondaryColor: BRAND_COLORS.secondary,
  accentColor: BRAND_COLORS.accent,
  // First visit shows LU in the header; official lockup is opt-in via Brand Kit
  useOfficialLogo: false,
  officialLogoVariant: "lockup" as OfficialLogoVariant,
  logoText: "LU",
  divisionId: defaults.assetPackPath.includes("caat") ? "caat" : undefined,
  websiteUrl: undefined as string | undefined,
  facebookUrl: undefined as string | undefined,
  customLinks: [] as { id: string; label: string; url: string }[],
  updatedAt: new Date().toISOString(),
};

export const PLATFORM_FORMATS = {
  facebookCover: { width: 820, height: 312, label: "Facebook Cover" },
  facebookPost: { width: 1200, height: 630, label: "Facebook Post" },
  instagramSquare: { width: 1080, height: 1080, label: "Instagram Square" },
  instagramStory: { width: 1080, height: 1920, label: "Instagram Story" },
  youtubeBanner: { width: 2560, height: 1440, label: "YouTube Banner" },
} as const;

export const MAX_UPLOAD_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

export { DEFAULT_LOCAL_NUMBER };
