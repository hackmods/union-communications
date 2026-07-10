import { getDefaultBrandDefaults } from "@/lib/tenant/loader";
import { DEFAULT_LOCAL_NUMBER } from "@/lib/utils/local";

const defaults = getDefaultBrandDefaults();

/** Platform-neutral brand palette — sourced from active tenant config */
export const BRAND_COLORS = {
  primary: defaults.primaryColor,
  secondary: defaults.secondaryColor,
  accent: defaults.accentColor,
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
} as const;

/** @deprecated Use BRAND_COLORS — kept for gradual migration */
export const CAAT_OPSEU_COLORS = BRAND_COLORS;

export const DEFAULT_ASSET_PACK_PATH = defaults.assetPackPath;

export const DEFAULT_BRAND_KIT = {
  version: "1.0" as const,
  local: {
    id: "local-default",
    localNumber: "",
    subText: "Support Staff",
    divisionId: defaults.assetPackPath.includes("caat") ? "caat" : undefined,
  },
  primaryColor: BRAND_COLORS.primary,
  secondaryColor: BRAND_COLORS.secondary,
  accentColor: BRAND_COLORS.accent,
  // First visit shows LU in the header; onboarding/brand kit default to OPSEU
  useOfficialLogo: false,
  logoText: "LU",
  divisionId: defaults.assetPackPath.includes("caat") ? "caat" : undefined,
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
