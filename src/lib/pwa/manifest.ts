import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/constants/brand";
import {
  ICON_192_PATH,
  ICON_512_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo/site";

/** Display modes Chromium accepts for installability. */
export const PWA_INSTALLABLE_DISPLAY = new Set([
  "standalone",
  "fullscreen",
  "minimal-ui",
]);

export function pwaStartUrl(officerHubPublic: boolean): string {
  return officerHubPublic ? "/en/app/" : "/en/";
}

export type BuildWebManifestOptions = {
  officerHubPublic: boolean;
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
  return {
    name: options.name ?? SITE_NAME,
    short_name: options.shortName ?? SITE_NAME,
    description: options.description ?? SITE_DESCRIPTION,
    start_url: pwaStartUrl(options.officerHubPublic),
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: options.themeColor ?? BRAND_COLORS.primary,
    lang: "en",
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
