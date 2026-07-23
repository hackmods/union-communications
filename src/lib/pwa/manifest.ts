import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { routing, type Locale } from "@/i18n/routing";
import {
  ICON_192_PATH,
  ICON_512_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo/site";
import { isPwaShellLocale } from "@/lib/pwa/shell";

/** Display modes Chromium accepts for installability. */
export const PWA_INSTALLABLE_DISPLAY = new Set([
  "standalone",
  "fullscreen",
  "minimal-ui",
]);

/** next-intl default locale cookie name (see receiveLocaleCookie). */
export const PWA_LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Prefer next-intl cookie, then Accept-Language, then defaultLocale.
 * Used so `/manifest.webmanifest` `start_url` matches the user's language.
 */
export function resolvePwaManifestLocale(options: {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isPwaShellLocale(options.cookieLocale)) {
    return options.cookieLocale;
  }

  const fromHeader = preferredLocaleFromAcceptLanguage(options.acceptLanguage);
  if (fromHeader) return fromHeader;

  return routing.defaultLocale;
}

/** Lightweight Accept-Language pick among app locales (no Negotiator dependency). */
export function preferredLocaleFromAcceptLanguage(
  header: string | null | undefined,
): Locale | null {
  if (!header) return null;

  const ranked: { tag: string; q: number }[] = [];
  for (const part of header.split(",")) {
    const [rawTag, ...params] = part.trim().split(";");
    if (!rawTag) continue;
    const tag = rawTag.trim().toLowerCase();
    if (!tag || tag === "*") continue;
    let q = 1;
    for (const param of params) {
      const [k, v] = param.trim().split("=");
      if (k === "q" && v) {
        const parsed = Number.parseFloat(v);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    ranked.push({ tag, q });
  }

  ranked.sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    if (isPwaShellLocale(primary)) return primary;
    if (isPwaShellLocale(tag)) return tag;
  }

  return null;
}

export function pwaStartUrl(
  officerHubPublic: boolean,
  locale: Locale = routing.defaultLocale,
): string {
  const safe = isPwaShellLocale(locale) ? locale : routing.defaultLocale;
  return officerHubPublic ? `/${safe}/app/` : `/${safe}/`;
}

export type BuildWebManifestOptions = {
  officerHubPublic: boolean;
  locale?: Locale;
  name?: string;
  shortName?: string;
  description?: string;
  themeColor?: string;
  icon192?: string;
  icon512?: string;
};

/**
 * Web app manifest used for browser “Install app” / desktop install prompts.
 * Keep required installability fields intact when editing.
 */
export function buildWebManifest(
  options: BuildWebManifestOptions,
): MetadataRoute.Manifest {
  const locale = options.locale ?? routing.defaultLocale;
  return {
    name: options.name ?? SITE_NAME,
    short_name: options.shortName ?? SITE_NAME,
    description: options.description ?? SITE_DESCRIPTION,
    start_url: pwaStartUrl(options.officerHubPublic, locale),
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: options.themeColor ?? BRAND_COLORS.primary,
    lang: locale,
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: options.icon192 ?? ICON_192_PATH,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: options.icon512 ?? ICON_512_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

/** Chromium-style installability checks (manifest-side only; SW is separate). */
export function assertManifestInstallable(
  manifest: MetadataRoute.Manifest,
): string[] {
  const errors: string[] = [];

  if (!manifest.name && !manifest.short_name) {
    errors.push("manifest needs name or short_name");
  }
  if (!manifest.start_url) {
    errors.push("manifest needs start_url");
  }
  if (!manifest.display || !PWA_INSTALLABLE_DISPLAY.has(manifest.display)) {
    errors.push(
      `manifest display must be one of: ${[...PWA_INSTALLABLE_DISPLAY].join(", ")}`,
    );
  }

  const icons = manifest.icons ?? [];
  const has192 = icons.some((icon) => icon.sizes?.includes("192x192"));
  const has512 = icons.some((icon) => icon.sizes?.includes("512x512"));
  if (!has192) errors.push("manifest needs a 192x192 icon");
  if (!has512) errors.push("manifest needs a 512x512 icon");

  return errors;
}
