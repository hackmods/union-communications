import { describe, expect, it } from "vitest";
import { PUBLIC_PATHS } from "@/app/sitemap";
import { allRegisteredGuidePaths } from "@/lib/comms/guide-registry";
import {
  allContentReviewHrefs,
  buildContentReviewCatalog,
  publicToolPaths,
} from "@/lib/ops/content-review-catalog";

describe("content-review-catalog", () => {
  it("includes every PUBLIC_PATHS entry", () => {
    const hrefs = new Set(allContentReviewHrefs());
    const missing = PUBLIC_PATHS.filter((path) => !hrefs.has(path));
    expect(missing, `missing from review catalog: ${missing.join(", ")}`).toEqual([]);
  });

  it("includes every public tool slug path", () => {
    const hrefs = new Set(allContentReviewHrefs());
    const missing = publicToolPaths().filter((path) => !hrefs.has(path));
    expect(missing).toEqual([]);
  });

  it("includes every registered guide path", () => {
    const hrefs = new Set(allContentReviewHrefs());
    const missing = allRegisteredGuidePaths().filter((path) => !hrefs.has(path));
    expect(missing).toEqual([]);
  });

  it("lists PDF export surfaces with pdf or canvas tags", () => {
    const pdfSection = buildContentReviewCatalog().find((s) => s.id === "pdfExports");
    expect(pdfSection).toBeDefined();
    expect(pdfSection!.entries.length).toBeGreaterThan(10);
    for (const entry of pdfSection!.entries) {
      expect(entry.tags?.length).toBeGreaterThan(0);
    }
  });

  it("marks hub and portal sections as requiring auth", () => {
    const catalog = buildContentReviewCatalog();
    expect(catalog.find((s) => s.id === "hub")?.requiresAuth).toBe(true);
    expect(catalog.find((s) => s.id === "portal")?.requiresAuth).toBe(true);
  });
});

describe("sitemap SEO guard", () => {
  it("excludes operator review catalog from PUBLIC_PATHS", () => {
    expect(PUBLIC_PATHS).not.toContain("/build");
    expect(PUBLIC_PATHS).not.toContain("/build/review");
  });
});
