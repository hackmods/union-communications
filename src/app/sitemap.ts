import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import {
  PUBLIC_CATALOG,
  catalogPaths,
} from "@/lib/comms/public-catalog";
import { OFFICER_LEARNING_MODULES } from "@/lib/officer-learning/modules";
import { canonicalPublicPath } from "@/lib/seo/public-routes";
import { getPlatformDisabledToolSlugs } from "@/lib/public-tools/store";

const LOCALES = ["en", "fr"] as const;

/** Non-catalog public leaves with their own indexable pages. */
const SHELL_PATHS = [
  "/",
  "/start",
  "/create",
  "/utilities",
  "/learn",
  "/platform",
  "/manifesto",
  "/updates",
  "/support",
  "/install",
  "/privacy",
  "/security",
  "/accessibility",
  "/feedback",
  "/join",
  "/request-access",
  "/learn/library",
] as const;

/** Public indexable paths (no locale prefix), derived from canonical registries. */
export const PUBLIC_PATHS = [
  ...new Set([
    ...SHELL_PATHS,
    ...catalogPaths().filter((path) => {
      const item = PUBLIC_CATALOG.find((candidate) => candidate.canonicalPath === path);
      // Signed-in Hub publishing tools are not public discovery pages.
      return item?.authRequirement !== "signed-in";
    }),
    ...OFFICER_LEARNING_MODULES.map(({ slug }) =>
      canonicalPublicPath(`/guide/officer-learning/${slug}`),
    ),
  ]),
];

function localeUrl(locale: string, path: string): string {
  if (path === "/") return `${SITE_URL}/${locale}/`;
  return `${SITE_URL}/${locale}${path}/`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const disabled = new Set(await getPlatformDisabledToolSlugs());

  for (const path of PUBLIC_PATHS) {
    const tool = PUBLIC_CATALOG.find(
      (item) => item.kind === "tool" && item.canonicalPath === path,
    );
    const legacySlug = tool?.legacyPaths
      .find((legacyPath) => legacyPath.startsWith("/tools/"))
      ?.slice("/tools/".length);
    if (legacySlug && disabled.has(legacySlug)) continue;

    for (const locale of LOCALES) {
      entries.push({
        url: localeUrl(locale, path),
        alternates: {
          languages: {
            en: localeUrl("en", path),
            fr: localeUrl("fr", path),
            "x-default": localeUrl("en", path),
          },
        },
      });
    }
  }

  return entries;
}
