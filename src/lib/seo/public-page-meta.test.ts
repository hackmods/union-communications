import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "@/app/sitemap";
import { TOOL_SEO, TOOL_SLUGS } from "@/lib/seo/tool-meta";
import {
  PUBLIC_PAGE_SEO,
  PUBLIC_PAGE_SEO_PATHS,
  getPublicPageSeo,
} from "@/lib/seo/public-page-meta";

/**
 * Search snippets truncate near 155-160 characters. Below ~95 we are leaving
 * space on the table that could name a concrete outcome; above 165 the tail is
 * cut off mid-clause. Neither end is fatal, so this is a band, not a target.
 */
const DESCRIPTION_MIN = 95;
const DESCRIPTION_MAX = 165;

/** Routes with dedicated inline generateMetadata (not PUBLIC_PAGE_SEO). */
const INLINE_META_PATHS = new Set([
  "/",
  "/manifesto",
  "/support",
  "/install",
]);

describe("public-page-meta", () => {
  it("has matching EN and FR path keys", () => {
    expect(Object.keys(PUBLIC_PAGE_SEO.en).sort()).toEqual(
      Object.keys(PUBLIC_PAGE_SEO.fr).sort(),
    );
  });

  it("covers every non-inline, non-tool PUBLIC_PATHS entry", () => {
    const toolPaths = new Set(TOOL_SLUGS.map((slug) => `/tools/${slug}`));
    const missing: string[] = [];

    for (const path of PUBLIC_PATHS) {
      if (INLINE_META_PATHS.has(path)) continue;
      if (toolPaths.has(path)) continue;
      if (!PUBLIC_PAGE_SEO.en[path]) missing.push(path);
    }

    expect(missing, `missing PUBLIC_PAGE_SEO for: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("does not include tool or inline-only paths", () => {
    for (const path of PUBLIC_PAGE_SEO_PATHS) {
      expect(INLINE_META_PATHS.has(path)).toBe(false);
      expect(path.startsWith("/tools/") && path !== "/tools").toBe(false);
    }
  });

  it("returns locale-specific titles", () => {
    expect(getPublicPageSeo("en", "/guide/print")?.title).toMatch(/Print/i);
    expect(getPublicPageSeo("fr", "/guide/print")?.title).toMatch(/imprim/i);
  });
});

describe("SEO description quality", () => {
  const entries = [
    ...(["en", "fr"] as const).flatMap((locale) =>
      Object.entries(PUBLIC_PAGE_SEO[locale]).map(
        ([path, seo]) => [`${locale} ${path}`, seo.description] as const,
      ),
    ),
    ...(["en", "fr"] as const).flatMap((locale) =>
      Object.entries(TOOL_SEO[locale]).map(
        ([slug, seo]) => [`${locale} tools/${slug}`, seo.description] as const,
      ),
    ),
  ];

  it("keeps every description inside the snippet budget", () => {
    const outOfBand = entries
      .filter(
        ([, d]) => d.length < DESCRIPTION_MIN || d.length > DESCRIPTION_MAX,
      )
      .map(([key, d]) => `${key} (${d.length}): ${d}`);
    expect(outOfBand, outOfBand.join("\n")).toEqual([]);
  });

  it("has no duplicate descriptions within a locale", () => {
    for (const locale of ["en", "fr"] as const) {
      const seen = new Map<string, string>();
      const duplicates: string[] = [];
      for (const [key, description] of entries) {
        if (!key.startsWith(locale)) continue;
        const previous = seen.get(description);
        if (previous) duplicates.push(`${key} duplicates ${previous}`);
        else seen.set(description, key);
      }
      expect(duplicates, duplicates.join("\n")).toEqual([]);
    }
  });

  it("starts each description sentence with a capital", () => {
    // Same mechanical-edit fingerprint the copy guard watches for: a period
    // followed by a lowercase letter, which renders verbatim in search results.
    const broken = entries
      .filter(([, d]) => /[a-z]\. +[a-z\u00e0-\u00ff]/.test(d))
      .map(([key, d]) => `${key}: ${d}`);
    expect(broken, broken.join("\n")).toEqual([]);
  });
});
