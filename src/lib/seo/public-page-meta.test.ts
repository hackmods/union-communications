import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "@/app/sitemap";
import { TOOL_SLUGS } from "@/lib/seo/tool-meta";
import {
  PUBLIC_PAGE_SEO,
  PUBLIC_PAGE_SEO_PATHS,
  getPublicPageSeo,
} from "@/lib/seo/public-page-meta";

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
