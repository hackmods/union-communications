import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";

export type { BoardLogoMode };

export function defaultLogoMode(themeEstablished: boolean): BoardLogoMode {
  return themeEstablished ? "lockup" : "none";
}

export function showCanvasLogo(logoMode: BoardLogoMode): boolean {
  return logoMode !== "none";
}

/** Map logo mode to BrandLogo variant; optional auto-mark for tight wallet/board cells. */
export function resolveLogoVariant(
  logoMode: BoardLogoMode,
  opts?: { preferMark?: boolean },
): "lockup" | "mark" | undefined {
  if (logoMode === "none") return undefined;
  if (logoMode === "mark") return "mark";
  return opts?.preferMark ? "mark" : "lockup";
}

/** Migrate saved drafts that still store `includeBranding`. */
export function logoModeFromLegacyBranding(
  includeBranding: boolean | undefined,
  fallback: BoardLogoMode = "none",
): BoardLogoMode {
  if (includeBranding === true) return "lockup";
  if (includeBranding === false) return "none";
  return fallback;
}

export function normalizeLogoMode(
  value: {
    logoMode?: BoardLogoMode;
    includeBranding?: boolean;
  },
  themeEstablished: boolean,
): BoardLogoMode {
  if (
    value.logoMode === "none" ||
    value.logoMode === "lockup" ||
    value.logoMode === "mark"
  ) {
    return value.logoMode;
  }
  return logoModeFromLegacyBranding(
    value.includeBranding,
    defaultLogoMode(themeEstablished),
  );
}
