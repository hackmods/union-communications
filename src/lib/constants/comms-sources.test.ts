import { describe, it, expect } from "vitest";
import {
  COMMS_SOURCES,
  getOpseuWebsiteFooterSources,
  getSourcesForPage,
  getSourcesByCategory,
  isReferenceAssetPackVisible,
  OPSEU_WEBSITE_FOOTER_SOURCE_IDS,
  PAGE_SOURCE_IDS,
  sourceMatchesUnion,
} from "@/lib/constants/comms-sources";

describe("comms-sources", () => {
  it("resolves sources for each mapped page (reference / unset preset)", () => {
    for (const [pageId, ids] of Object.entries(PAGE_SOURCE_IDS)) {
      const sources = getSourcesForPage(pageId);
      expect(sources).toHaveLength(ids.length);
      for (const source of sources) {
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("includes local243 and OPSEU branding references for OPSEU / unset", () => {
    const website = getSourcesForPage("websiteTemplate");
    expect(website.some((s) => s.id === "local243-website")).toBe(true);
    expect(website.some((s) => s.id === "opseu-branding")).toBe(true);
  });

  it("hides OPSEU-scoped sources when Brand Kit preset is another union", () => {
    expect(getSourcesForPage("print", "cupe")).toHaveLength(0);
    expect(getSourcesForPage("blueprint", "cupe").map((s) => s.id)).toEqual([
      "wcag-21",
      "facebook-groups",
    ]);
    expect(
      getSourcesForPage("websiteTemplate", "unifor").map((s) => s.id),
    ).toEqual(["github-pages"]);
    expect(getSourcesForPage("rightToRefuse", "cupe").map((s) => s.id)).toEqual(
      ["ontario-ohsa", "ontario-required-posters"],
    );
  });

  it("keeps OPSEU-scoped sources when preset is opseu", () => {
    expect(getSourcesForPage("print", "opseu").some((s) => s.id === "opseu-branding")).toBe(
      true,
    );
  });

  it("matches union scope rules for reference vs other presets", () => {
    const scoped = COMMS_SOURCES["opseu-branding"];
    const universal = COMMS_SOURCES["wcag-21"];
    expect(sourceMatchesUnion(scoped, undefined)).toBe(true);
    expect(sourceMatchesUnion(scoped, "opseu")).toBe(true);
    expect(sourceMatchesUnion(scoped, "cupe")).toBe(false);
    expect(sourceMatchesUnion(universal, "cupe")).toBe(true);
  });

  it("shows reference asset pack only for unset or opseu", () => {
    expect(isReferenceAssetPackVisible(undefined)).toBe(true);
    expect(isReferenceAssetPackVisible("opseu")).toBe(true);
    expect(isReferenceAssetPackVisible("cupe")).toBe(false);
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

  it("uses the bilingual OPSEU / SEFPO lockup on OPSEU-scoped labels and notes", () => {
    for (const source of Object.values(COMMS_SOURCES)) {
      if (!source.unionIds?.includes("opseu")) continue;
      const stripped = `${source.label} ${source.note}`.replace(
        /OPSEU \/ SEFPO/g,
        "",
      );
      expect(stripped, source.id).not.toMatch(/\b(?:OPSEU|SEFPO)\b/);
    }
  });

  it("points opseu-branding at the About OPSEU / SEFPO hub (not /about or legacy /12263)", () => {
    expect(COMMS_SOURCES["opseu-branding"].url).toBe(
      "https://opseu.org/about-opseu-sefpo/",
    );
    expect(COMMS_SOURCES["opseu-branding"].url).not.toContain("12263");
    expect(COMMS_SOURCES["opseu-branding"].url).not.toMatch(
      /opseu\.org\/about\/?$/,
    );
  });

  it("points OPSEU footer hubs at current national slugs (not retired paths)", () => {
    expect(COMMS_SOURCES["opseu-contact"].url).toBe(
      "https://opseu.org/contact-us/",
    );
    expect(COMMS_SOURCES["opseu-contact"].url).not.toMatch(
      /opseu\.org\/contact\/?$/,
    );
    expect(COMMS_SOURCES["opseu-collective-agreements"].url).toBe(
      "https://opseu.org/information/general/find-your-collective-agreement/12967/",
    );
    expect(COMMS_SOURCES["opseu-collective-agreements"].url).not.toContain(
      "bargaining/collective-agreements-and-arbitration-awards",
    );
    expect(COMMS_SOURCES["opseu-forms"].url).toBe(
      "https://opseu.org/opseu-members-tools-and-resources/",
    );
    expect(COMMS_SOURCES["opseu-forms"].url).not.toContain("forms-documents");
    expect(COMMS_SOURCES["opseu-home"].url).toBe("https://opseu.org/");
    expect(COMMS_SOURCES["opseu-member-portal"].url).toBe(
      "https://members.opseu.org/",
    );
  });

  it("resolves OPSEU website ZIP footer links from the registry", () => {
    const footer = getOpseuWebsiteFooterSources();
    expect(footer).toHaveLength(OPSEU_WEBSITE_FOOTER_SOURCE_IDS.length);
    expect(footer.map((s) => s.id)).toEqual([...OPSEU_WEBSITE_FOOTER_SOURCE_IDS]);
  });
});
