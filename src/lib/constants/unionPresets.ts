/**
 * Starter branding presets for common Canadian unions.
 * Colours and non-OPSEU logos are generic starters — not official trademarked assets.
 * OPSEU lockup/mark use the bundled reference tenant pack.
 * Missing / empty logo packs fall back to UnionOps platform marks.
 */

import type { BrandKitPatch } from "@/types/entities";

export interface UnionLogoPack {
  /** Wide wordmark / lockup */
  lockup?: string;
  /** Square mark */
  mark?: string;
  /** Mark for dark / brand-coloured backgrounds */
  markOnDark?: string;
  /**
   * When true, Brand Kit uses the OPSEU official pack (`OFFICIAL_LOGOS`)
   * instead of treating paths as custom uploads — only when lockup/mark paths exist.
   */
  useOfficialPack?: boolean;
}

export interface UnionBranding {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  defaultSlogans: string[];
  /** Optional; omitted or empty → UnionOps platform logos */
  logos?: UnionLogoPack;
}

/**
 * Platform chrome orange — generic, not affiliated with any union brand.
 * Primary/accent meet WCAG AA (≥4.5:1) with white and light tinted backgrounds.
 * Bright #FF6B00 may appear in legacy assets; platform marks use #C2410C.
 */
export const PLATFORM_UNION_ORANGE = {
  primary: "#C2410C",
  secondary: "#FFFFFF",
  accent: "#9A3412",
} as const;

/** Platform site logo (UnionOps) — always present under public/assets/unionops/ */
export const UNIONOPS_LOGOS = {
  lockup: "/assets/unionops/logo-lockup.svg",
  mark: "/assets/unionops/logo-mark.svg",
  markOnDark: "/assets/unionops/logo-mark-on-dark.svg",
} as const;

export function isUnionOpsLogoSrc(src?: string | null): boolean {
  const value = src?.trim();
  if (!value) return false;
  return (
    value === UNIONOPS_LOGOS.mark ||
    value === UNIONOPS_LOGOS.lockup ||
    value === UNIONOPS_LOGOS.markOnDark
  );
}

export type ResolvedUnionLogoPack = {
  lockup: string;
  mark: string;
  markOnDark: string;
  useOfficialPack: boolean;
};

function nonEmpty(src: string | undefined): string | undefined {
  const trimmed = src?.trim();
  return trimmed ? trimmed : undefined;
}

/** Fill missing logo paths with UnionOps so UI never points at empty srcs. */
export function resolvePresetLogos(
  logos?: UnionLogoPack | null,
): ResolvedUnionLogoPack {
  const lockup = nonEmpty(logos?.lockup) ?? UNIONOPS_LOGOS.lockup;
  const mark = nonEmpty(logos?.mark) ?? UNIONOPS_LOGOS.mark;
  const markOnDark =
    nonEmpty(logos?.markOnDark) ??
    (mark === UNIONOPS_LOGOS.mark
      ? UNIONOPS_LOGOS.markOnDark
      : mark);

  // Official pack only when explicitly requested AND both assets are populated
  const useOfficialPack = Boolean(
    logos?.useOfficialPack &&
      nonEmpty(logos.lockup) &&
      nonEmpty(logos.mark),
  );

  return { lockup, mark, markOnDark, useOfficialPack };
}

export function unionOpsLogoSrc(onDark = false): string {
  return onDark ? UNIONOPS_LOGOS.markOnDark : UNIONOPS_LOGOS.mark;
}

export const UNION_PRESETS: UnionBranding[] = [
  {
    id: "opseu",
    name: "OPSEU",
    primaryColor: "#003DA5",
    secondaryColor: "#FFFFFF",
    defaultSlogans: ["Educate. Advocate. Organize."],
    logos: {
      useOfficialPack: true,
      lockup: "/assets/caat-opseu/logo-primary.png",
      mark: "/assets/caat-opseu/logo-mark.png",
      markOnDark: "/assets/caat-opseu/logo-mark-white.png",
    },
  },
  {
    id: "cupe",
    name: "CUPE",
    primaryColor: "#E5007D",
    secondaryColor: "#FFFFFF",
    defaultSlogans: ["On the front line."],
    logos: {
      lockup: "/assets/unions/cupe/logo.svg",
      mark: "/assets/unions/cupe/logo-mark.svg",
    },
  },
  {
    id: "unifor",
    name: "Unifor",
    primaryColor: "#ED1B2F",
    secondaryColor: "#FFFFFF",
    defaultSlogans: ["A union for everyone."],
    logos: {
      lockup: "/assets/unions/unifor/logo.svg",
      mark: "/assets/unions/unifor/logo-mark.svg",
    },
  },
  {
    id: "usw",
    name: "USW",
    primaryColor: "#002A5C",
    secondaryColor: "#FFC72C",
    defaultSlogans: ["Unity and Strength for Workers."],
    logos: {
      lockup: "/assets/unions/usw/logo.svg",
      mark: "/assets/unions/usw/logo-mark.svg",
    },
  },
  {
    id: "ona",
    name: "ONA",
    primaryColor: "#003865",
    secondaryColor: "#FFD100",
    defaultSlogans: ["Stand up, speak out."],
    logos: {
      lockup: "/assets/unions/ona/logo.svg",
      mark: "/assets/unions/ona/logo-mark.svg",
    },
  },
  {
    id: "psac",
    name: "PSAC",
    primaryColor: "#E31837",
    secondaryColor: "#FFFFFF",
    defaultSlogans: ["Here for Canada."],
    logos: {
      lockup: "/assets/unions/psac/logo.svg",
      mark: "/assets/unions/psac/logo-mark.svg",
    },
  },
];

export function getUnionPreset(id: string): UnionBranding | undefined {
  return UNION_PRESETS.find((p) => p.id === id);
}

/** Darken a hex colour for accent use on light backgrounds. */
export function deriveAccentFromPrimary(primaryColor: string): string {
  const hex = primaryColor.replace("#", "");
  if (hex.length !== 6) return PLATFORM_UNION_ORANGE.accent;
  const r = Math.max(0, Math.round(parseInt(hex.slice(0, 2), 16) * 0.72));
  const g = Math.max(0, Math.round(parseInt(hex.slice(2, 4), 16) * 0.72));
  const b = Math.max(0, Math.round(parseInt(hex.slice(4, 6), 16) * 0.72));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

export function colorsFromUnionPreset(preset: UnionBranding): {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
} {
  return {
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    accentColor: deriveAccentFromPrimary(preset.primaryColor),
  };
}

/** Brand Kit colour + logo + sub-text fields when applying a union preset.
 * OPSEU uses the official pack; others default to the UnionOps mark
 * tinted with the preset primary (starter logos remain optional in Logo Settings).
 */
export function brandFieldsFromUnionPreset(
  preset: UnionBranding,
): BrandKitPatch {
  const colors = colorsFromUnionPreset(preset);
  const logos = resolvePresetLogos(preset.logos);
  const logoText = preset.name.slice(0, 4).toUpperCase();
  const subText = preset.defaultSlogans[0] ?? "";

  if (logos.useOfficialPack) {
    return {
      ...colors,
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      customLogoDataUrl: undefined,
      logoText,
      unionPresetId: preset.id,
      local: { subText },
    };
  }

  return {
    ...colors,
    useOfficialLogo: false,
    // Platform mark — BrandLogo / UnionOpsMark tints it to primaryColor
    customLogoDataUrl: UNIONOPS_LOGOS.mark,
    logoText,
    unionPresetId: preset.id,
    local: { subText },
  };
}
