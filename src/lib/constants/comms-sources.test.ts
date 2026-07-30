import { describe, it, expect } from "vitest";
import {
  COMMS_SOURCES,
  getOpseuWebsiteFooterSources,
  getSourcesForPage,
  getSourcesByCategory,
  OPSEU_WEBSITE_FOOTER_SOURCE_IDS,
  PAGE_SOURCE_IDS,
} from "@/lib/constants/comms-sources";

describe("comms-sources", () => {
  it("resolves sources for each mapped page", () => {
    for (const [pageId, ids] of Object.entries(PAGE_SOURCE_IDS)) {
      const sources = getSourcesForPage(pageId);
      expect(sources).toHaveLength(ids.length);
      for (const source of sources) {
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("includes local243 and OPSEU branding references", () => {
    const website = getSourcesForPage("websiteTemplate");
    expect(website.some((s) => s.id === "local243-website")).toBe(true);
    expect(website.some((s) => s.id === "opseu-branding")).toBe(true);
  });

  it("groups sources by category without duplicates", () => {
    const all = Object.values(COMMS_SOURCES);
    const grouped = getSourcesByCategory(all);
    const flat = Object.values(grouped).flat();
    expect(flat).toHaveLength(all.length);
  });

  it("uses unique https URLs across the registry", () => {
    const urls = Object.values(COMMS_SOURCES).map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("points opseu-branding at the About hub (not legacy /12263 deep link)", () => {
    expect(COMMS_SOURCES["opseu-branding"].url).toBe("https://opseu.org/about/");
    expect(COMMS_SOURCES["opseu-branding"].url).not.toContain("12263");
  });

  it("resolves OPSEU website ZIP footer links from the registry", () => {
    const footer = getOpseuWebsiteFooterSources();
    expect(footer).toHaveLength(OPSEU_WEBSITE_FOOTER_SOURCE_IDS.length);
    expect(footer.map((s) => s.id)).toEqual([...OPSEU_WEBSITE_FOOTER_SOURCE_IDS]);
  });
});
