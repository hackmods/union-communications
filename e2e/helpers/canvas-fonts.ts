import type { Page } from "@playwright/test";
import {
  BRAND_KIT_KEY,
  ONBOARDING_KEY,
} from "../../src/lib/data/adapter";
import { EXPORT_ROOT_SELECTOR } from "../../src/lib/export/export-root";
import type { CanvasFontId } from "../../src/lib/comms/canvas-fonts";

/** CSS custom properties registered by `src/app/canvas-fonts.ts`. */
export const CANVAS_FONT_CSS_VARS = [
  "--font-montserrat",
  "--font-source-sans",
  "--font-barlow-condensed",
  "--font-oswald",
  "--font-source-serif",
  "--font-roboto-slab",
] as const;

export type SeedCanvasFontsOpts = {
  headlineFontId?: CanvasFontId;
  bodyFontId?: CanvasFontId;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
};

/**
 * Seed Brand Kit + onboarding before first paint so tools hydrate with
 * canvas typefaces (DataAdapter localStorage).
 */
export async function seedCanvasFonts(
  page: Page,
  opts: SeedCanvasFontsOpts = {},
): Promise<void> {
  const headlineFontId = opts.headlineFontId ?? "montserrat";
  const bodyFontId = opts.bodyFontId ?? "sourceSans";
  const primaryColor = opts.primaryColor ?? "#003DA5";
  const secondaryColor = opts.secondaryColor ?? "#002868";
  const accentColor = opts.accentColor ?? "#FFFFFF";

  await page.addInitScript(
    ({ brandKey, onboardKey, kit }) => {
      localStorage.setItem(brandKey, JSON.stringify(kit));
      localStorage.setItem(onboardKey, "true");
    },
    {
      brandKey: BRAND_KIT_KEY,
      onboardKey: ONBOARDING_KEY,
      kit: {
        version: "2.0",
        local: {
          id: "local-e2e",
          localNumber: "243",
          subText: "Font e2e",
        },
        primaryColor,
        secondaryColor,
        accentColor,
        useOfficialLogo: false,
        officialLogoVariant: "lockup",
        logoText: "UO",
        customLinks: [],
        membershipUrls: [],
        canvas: {
          styleId: "solid",
          headlineFontId,
          bodyFontId,
          typeScale: "display",
        },
        updatedAt: new Date().toISOString(),
      },
    },
  );
}

/** Assert self-hosted canvas font CSS variables are defined on <html>. */
export async function assertCanvasFontCssVars(page: Page): Promise<void> {
  const values = await page.evaluate((vars) => {
    const cs = getComputedStyle(document.documentElement);
    return vars.map((v) => ({
      name: v,
      value: cs.getPropertyValue(v).trim(),
    }));
  }, [...CANVAS_FONT_CSS_VARS]);

  for (const { name, value } of values) {
    if (!value) {
      throw new Error(`Missing canvas font CSS variable ${name}`);
    }
  }
}

export async function awaitDocumentFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
}

/**
 * Resolved font-family on the first h2 inside the export capture root
 * (Graphic / Flyer / Board Notice headlines).
 */
export async function exportRootHeadlineFontFamily(
  page: Page,
): Promise<string> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) throw new Error(`No export root ${sel}`);
    const title =
      root.querySelector("h2") ??
      root.querySelector("h3") ??
      root.querySelector("[data-headline-line]");
    if (!title) throw new Error("No title node in export root");
    return getComputedStyle(title).fontFamily;
  }, EXPORT_ROOT_SELECTOR);
}

/** Brand Kit canvas preview specimen headline (not always data-export-root). */
export async function brandKitPreviewHeadlineFontFamily(
  page: Page,
): Promise<string> {
  return page.evaluate(() => {
    const preview = document.querySelector(
      '[aria-hidden] h2, [class*="rounded"] h2',
    );
    // Prefer the canvas style card specimen — first h2 under Brand Kit main
    const main = document.querySelector("main");
    const h2 = main?.querySelector("h2");
    const node = h2 ?? preview;
    if (!node) throw new Error("No Brand Kit preview headline");
    return getComputedStyle(node).fontFamily;
  });
}

/**
 * True when computed family looks like a loaded webfont (not pure system-ui).
 * next/font/local injects a generated family name referenced by the CSS var.
 */
export function looksLikeWebfontFamily(fontFamily: string): boolean {
  const lower = fontFamily.toLowerCase();
  if (lower.includes("var(")) return false;
  // System residual stacks
  if (
    lower.startsWith("system-ui") ||
    lower.includes("segoe ui") ||
    lower.startsWith("georgia")
  ) {
    return false;
  }
  // next/font hashed names often include underscores; OFL faces may appear by name
  return (
    /__[\w]+_/.test(fontFamily) ||
    /montserrat|source.?sans|oswald|barlow|roboto.?slab|source.?serif/i.test(
      fontFamily,
    )
  );
}
