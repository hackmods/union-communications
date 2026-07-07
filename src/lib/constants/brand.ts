/** CAAT OPSEU official brand palette defaults */
export const CAAT_OPSEU_COLORS = {
  primary: "#003DA5",
  secondary: "#FFD200",
  accent: "#002868",
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
} as const;

export const DEFAULT_BRAND_KIT = {
  version: "1.0" as const,
  local: {
    id: "local-default",
    localNumber: "",
    subText: "Support Staff",
    divisionId: "caat",
  },
  primaryColor: CAAT_OPSEU_COLORS.primary,
  secondaryColor: CAAT_OPSEU_COLORS.secondary,
  accentColor: CAAT_OPSEU_COLORS.accent,
  useOfficialLogo: true,
  divisionId: "caat",
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
