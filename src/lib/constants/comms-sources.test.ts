import { describe, it, expect } from "vitest";
import {
  COMMS_SOURCES,
  getSourcesForPage,
  getSourcesByCategory,
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
});
