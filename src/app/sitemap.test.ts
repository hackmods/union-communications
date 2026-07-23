import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/seo/site";
import sitemap from "./sitemap";

/** Top-level guide routes from `src/app/[locale]/guide/` (index + immediate children). */
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
  it("includes every top-level /guide route from the filesystem (en + fr)", () => {
    const entries = sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const guidePaths = guidePathsFromFilesystem();

    expect(guidePaths).toContain("/guide");

    for (const guidePath of guidePaths) {
      for (const locale of ["en", "fr"] as const) {
        const url = `${SITE_URL}/${locale}${guidePath}/`;
        expect(urls.has(url), `missing sitemap entry ${url}`).toBe(true);
      }
    }
  });
});
