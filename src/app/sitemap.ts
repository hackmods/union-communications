import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { TOOL_SLUGS } from "@/lib/seo/tool-meta";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

const LOCALES = ["en", "fr"] as const;

/** Hub-gated authoring — requires login; omit from public sitemap. */
const NON_PUBLIC_TOOL_SLUGS = new Set(["pulse-poll"]);

/** Public indexable paths (no locale prefix). Exported for SEO coverage tests. */
export const PUBLIC_PATHS = [
  "/",
  "/manifesto",
  "/updates",
  "/support",
  "/install",
  "/privacy",
  "/accessibility",
  "/feedback",
  "/onboarding",
  "/brand-kit",
  "/examples",
  "/captions",
  "/assets",
  "/tools",
  "/guide",
  "/guide/social-media-plan",
  "/guide/workshop",
  "/guide/union-boards",
  "/guide/print",
  "/guide/website",
  "/guide/email-broadcast",
  "/guide/short-form",
  "/guide/resources",
  "/guide/photo-consent",
  "/guide/crisis",
  "/guide/membership-signup",
  "/guide/dfr",
  "/guide/seniority-bumping",
  "/guide/right-to-refuse",
  "/guide/joint-committee",
  ...TOOL_SLUGS.filter((slug) => !NON_PUBLIC_TOOL_SLUGS.has(slug)).map(
    (slug) => `/tools/${slug}`,
  ),
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
