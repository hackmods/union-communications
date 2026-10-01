/**
 * Helpers for the Brand Lookbook: scoped chrome CSS vars and draft BrandKit
 * samples that do not write steward localStorage.
 */

import type { CSSProperties } from "react";
import { resolveBrandChromeTokens } from "@/lib/brand/chrome-tokens";
import {
  brandThemeToKitPatch,
  type UnionBrandTheme,
} from "@/lib/brand/union-brand-theme";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import type { BrandKit } from "@/types/entities";

export type LookbookColourSource = Pick<
  BrandKit,
  "primaryColor" | "secondaryColor" | "accentColor"
>;

/** Inline CSS variables so nested `ui/*` chrome picks up a draft theme. */
export function lookbookScopeStyle(
  colours: LookbookColourSource,
): CSSProperties {
  const primary = colours.primaryColor;
  const secondary = colours.secondaryColor;
  const accent = colours.accentColor;
  const chrome = resolveBrandChromeTokens(primary, accent);
  return {
    ["--brand-primary" as string]: primary,
    ["--brand-secondary" as string]: secondary,
    ["--brand-accent" as string]: accent,
    ["--opseu-blue" as string]: chrome.interactive,
    ["--opseu-dark" as string]: chrome.heading,
    ["--color-opseu-blue" as string]: chrome.interactive,
    ["--color-opseu-dark" as string]: chrome.heading,
    ["--color-brand-primary" as string]: primary,
    ["--color-brand-secondary" as string]: secondary,
    ["--color-brand-accent" as string]: accent,
  };
}

/** True when readable Hub chrome darkens the raw Brand Kit primary. */
export function chromeDiffersFromPrimary(
  primaryColor: string,
  accentColor: string,
): boolean {
  const chrome = resolveBrandChromeTokens(primaryColor, accentColor);
  return chrome.interactive.toUpperCase() !== primaryColor.trim().toUpperCase();
}

/** Build a BrandKit sample from an operator theme (or partial colours). */
export function brandKitFromTheme(
  theme: UnionBrandTheme | LookbookColourSource,
  base: BrandKit = DEFAULT_BRAND_KIT,
): BrandKit {
  const asTheme: UnionBrandTheme = {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    ...("headlineFontId" in theme && theme.headlineFontId
      ? { headlineFontId: theme.headlineFontId }
      : {}),
    ...("bodyFontId" in theme && theme.bodyFontId
      ? { bodyFontId: theme.bodyFontId }
      : {}),
  };
  const patch = brandThemeToKitPatch(asTheme);
  return normalizeBrandKit({
    ...base,
    ...patch,
    local: { ...base.local },
    canvas: {
      ...(base.canvas ?? {}),
      ...(patch.canvas ?? {}),
    },
    updatedAt: new Date().toISOString(),
  });
}
