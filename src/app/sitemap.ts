import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { TOOL_SLUGS } from "@/lib/seo/tool-meta";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

const LOCALES = ["en", "fr"] as const;

const PUBLIC_PATHS = [
  "/",
  "/manifesto",
  "/support",
  "/install",
  "/privacy",
  "/accessibility",
  "/onboarding",
  "/brand-kit",
  "/examples",
  "/captions",
  "/assets",
  "/tools",
  "/guide",
  "/guide/social-media-plan",
  "/guide/union-boards",
  "/guide/print",
  "/guide/website",
  "/guide/resources",
  "/guide/photo-consent",
  "/guide/crisis",
  "/guide/membership-signup",
  ...TOOL_SLUGS.map((slug) => `/tools/${slug}`),
];

function localeUrl(locale: string, path: string): string {
  if (path === "/") return `${SITE_URL}/${locale}/`;
  return `${SITE_URL}/${locale}${path}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const path of PUBLIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: localeUrl(locale, path),
        lastModified: new Date(),
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

  if (isOfficerHubPublic()) {
    // Hub is noindex; omit from sitemap intentionally.
  }

  return entries;
}
