import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "./sitemap";
import { SITE_URL } from "@/lib/seo/site";
import sitemap from "./sitemap";
import { canonicalPublicPath } from "@/lib/seo/public-routes";

/** Top-level legacy guide routes from `src/app/[locale]/guide/`. */
function guidePathsFromFilesystem(): string[] {
  const guideDir = path.resolve(__dirname, "[locale]", "guide");
  const paths = ["/guide"];

  for (const name of readdirSync(guideDir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    if (existsSync(path.join(guideDir, name.name, "page.tsx"))) {
      paths.push(`/guide/${name.name}`);
    }
  }

  return paths.sort();
}

describe("sitemap", () => {
  it("excludes operator-only build routes from PUBLIC_PATHS", () => {
    expect(PUBLIC_PATHS).not.toContain("/build");
    expect(PUBLIC_PATHS).not.toContain("/build/review");
  });

  it("lists the localized public subprocessor register", async () => {
    expect(PUBLIC_PATHS).toContain("/trust");
    expect(PUBLIC_PATHS).toContain("/trust/subprocessors");
    for (const slug of ["privacy", "security", "accessibility"]) {
      expect(PUBLIC_PATHS).toContain(`/documents/${slug}`);
      expect(PUBLIC_PATHS).not.toContain(`/${slug}`);
    }
    const entries = await sitemap();
    const urls = new Set(entries.map((entry) => entry.url));
    expect(urls.has(`${SITE_URL}/en/trust/`)).toBe(true);
    expect(urls.has(`${SITE_URL}/fr/trust/`)).toBe(true);
    expect(urls.has(`${SITE_URL}/en/trust/subprocessors/`)).toBe(true);
    expect(urls.has(`${SITE_URL}/fr/trust/subprocessors/`)).toBe(true);
  });

  it("includes every top-level /guide route from the filesystem (en + fr)", async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const guidePaths = guidePathsFromFilesystem();

    expect(guidePaths).toContain("/guide");

    for (const guidePath of guidePaths) {
      const canonicalPath = canonicalPublicPath(guidePath);
      for (const locale of ["en", "fr"] as const) {
        const url = `${SITE_URL}/${locale}${canonicalPath}/`;
        expect(urls.has(url), `missing sitemap entry ${url}`).toBe(true);
      }
    }
  });
});
