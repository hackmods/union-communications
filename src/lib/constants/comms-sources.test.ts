import { describe, it, expect } from "vitest";
import {
  COMMS_SOURCES,
  commsSourceUrl,
  getOpseuWebsiteFooterSources,
  getSourcesForPage,
  getSourcesByCategory,
  getWebsiteRightsPartnersFederationSources,
  getWebsiteRightsPartnersOntarioSources,
  isReferenceAssetPackVisible,
  OPSEU_WEBSITE_FOOTER_SOURCE_IDS,
  PAGE_SOURCE_IDS,
  sourceMatchesUnion,
  WEBSITE_RIGHTS_PARTNERS_FEDERATION_SOURCE_IDS,
  WEBSITE_RIGHTS_PARTNERS_ONTARIO_SOURCE_IDS,
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
    expect(getSourcesForPage("print", "cupe").map((s) => s.id)).toEqual([
      "ontario-required-posters",
      "ontario-esa-poster",
      "wcag-21",
      "facebook-groups",
    ]);
    expect(getSourcesForPage("blueprint", "cupe").map((s) => s.id)).toEqual([
      "wcag-21",
      "facebook-groups",
      "instagram-reels",
      "ofl",
      "nupge",
      "clc",
    ]);
    expect(
      getSourcesForPage("websiteTemplate", "unifor").map((s) => s.id),
    ).toEqual(["github-pages"]);
    expect(getSourcesForPage("rightToRefuse", "cupe").map((s) => s.id)).toEqual([
      "ontario-ohsa",
      "ontario-ohsa-refusal-guide",
      "ontario-required-posters",
    ]);
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
      "https://opseu.org/information/find-your-collective-agreement/12967/",
    );
    expect(COMMS_SOURCES["opseu-collective-agreements"].url).not.toContain(
      "bargaining/collective-agreements-and-arbitration-awards",
    );
    expect(COMMS_SOURCES["opseu-collective-agreements"].url).not.toContain(
      "/information/general/",
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

  it("does not use known-retired OPSEU URL patterns in the registry", () => {
    const forbidden: Array<string | RegExp> = [
      "12263",
      /opseu\.org\/contact\/?$/,
      "bargaining/collective-agreements-and-arbitration-awards",
      "about-opseu-sefpo/forms-documents",
      "/information/general/find-your-collective-agreement",
      /opseu\.org\/about\/?$/,
    ];
    for (const source of Object.values(COMMS_SOURCES)) {
      for (const pattern of forbidden) {
        if (typeof pattern === "string") {
          expect(source.url, source.id).not.toContain(pattern);
        } else {
          expect(source.url, source.id).not.toMatch(pattern);
        }
      }
    }
  });

  it("points local243 reference site at the live canonical host", () => {
    expect(COMMS_SOURCES["local243-website"].url).toBe("https://opseu243.org/");
  });

  it("includes full-time and part-time CEC EERC archives on joint committee guide", () => {
    expect(getSourcesForPage("jointCommittee").map((s) => s.id)).toEqual([
      "opseu-collective-agreements",
      "opseu-eerc-minutes",
      "cec-pteerc-minutes",
      "cec-fteerc-minutes",
    ]);
  });

  it("maps DFR guide to statute and OLRB bulletins, not CA finder", () => {
    expect(getSourcesForPage("dfr").map((s) => s.id)).toEqual([
      "ontario-lra-s74",
      "ontario-ccba",
      "olrb-dfr-meaning",
      "olrb-dfr-applications",
      "clc-s37",
    ]);
  });

  it("maps workplace mapping guide to federation sources", () => {
    expect(getSourcesForPage("workplaceMapping").map((s) => s.id)).toEqual([
      "ofl",
      "nupge",
      "clc",
    ]);
  });

  it("maps grievance process guide to CA finder and labour statutes", () => {
    expect(getSourcesForPage("grievanceProcess").map((s) => s.id)).toEqual([
      "opseu-collective-agreements",
      "ontario-ccba",
      "ontario-lra-s74",
    ]);
  });

  it("maps photo consent guide to privacy sources, not WCAG", () => {
    expect(getSourcesForPage("photoConsent").map((s) => s.id)).toEqual([
      "ipc-video-surveillance",
      "pipeda-consent",
      "opseu-collective-agreements",
    ]);
  });

  it("resolves OPSEU website ZIP footer links from the registry", () => {
    const footer = getOpseuWebsiteFooterSources();
    expect(footer).toHaveLength(OPSEU_WEBSITE_FOOTER_SOURCE_IDS.length);
    expect(footer.map((s) => s.id)).toEqual([...OPSEU_WEBSITE_FOOTER_SOURCE_IDS]);
  });

  it("resolves Rights & Partners federation links from the registry", () => {
    const federations = getWebsiteRightsPartnersFederationSources();
    expect(federations).toHaveLength(
      WEBSITE_RIGHTS_PARTNERS_FEDERATION_SOURCE_IDS.length,
    );
    expect(federations.map((s) => s.id)).toEqual([
      ...WEBSITE_RIGHTS_PARTNERS_FEDERATION_SOURCE_IDS,
    ]);
    for (const source of federations) {
      expect(source.unionIds).toBeUndefined();
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it("resolves Rights & Partners Ontario links from the registry", () => {
    const ontario = getWebsiteRightsPartnersOntarioSources();
    expect(ontario).toHaveLength(WEBSITE_RIGHTS_PARTNERS_ONTARIO_SOURCE_IDS.length);
    expect(ontario.map((s) => s.id)).toEqual([
      ...WEBSITE_RIGHTS_PARTNERS_ONTARIO_SOURCE_IDS,
    ]);
    for (const source of ontario) {
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it("resolves commsSourceUrl for board and QR presets", () => {
    expect(commsSourceUrl("ontario-ohsa-guide")).toBe(
      COMMS_SOURCES["ontario-ohsa-guide"].url,
    );
    expect(commsSourceUrl("ontario-esa-poster")).toMatch(/mandatory-information/);
  });

  it("maps union boards guide to Ontario rights and federation sources", () => {
    expect(getSourcesForPage("unionBoards").map((s) => s.id)).toEqual([
      "opseu-collective-agreements",
      "opseu-branding",
      "ontario-required-posters",
      "ontario-esa-poster",
      "ontario-esa-guide",
      "ontario-ohsa",
      "ontario-ohsa-guide",
      "ontario-lra-s74",
      "ohrc-code-rights",
      "ofl",
      "nupge",
      "clc",
    ]);
  });
});
