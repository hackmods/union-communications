import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import {
  PUBLIC_CATALOG,
  publicCatalogItemForPath,
  relatedCatalogItems,
  visiblePublicCatalog,
} from "./public-catalog";
import { PUBLIC_PATHS } from "@/app/sitemap";

const locales = [en, fr] as const;

describe("public-catalog", () => {
  it("assigns every public destination one stable id and canonical route", () => {
    const ids = PUBLIC_CATALOG.map((item) => item.id);
    const paths = PUBLIC_CATALOG.map((item) => item.canonicalPath);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);

    for (const item of PUBLIC_CATALOG) {
      expect(item.canonicalPath.startsWith("/")).toBe(true);
      expect(item.legacyPaths.length).toBeGreaterThan(0);
      expect(item.audiences.length).toBeGreaterThan(0);
      expect(item.topics.length).toBeGreaterThan(0);
      expect(item.formats.length).toBeGreaterThan(0);
      expect(item.estimatedMinutes).toBeGreaterThan(0);
      for (const relatedId of item.relatedItemIds) {
        expect(PUBLIC_CATALOG.some((candidate) => candidate.id === relatedId)).toBe(true);
      }
    }
  });

  it("places Brand Kit first in the Tools catalog as the recommended setup", () => {
    expect(PUBLIC_CATALOG[0]).toMatchObject({
      id: "create-brand-kit",
      canonicalPath: "/create/brand-kit",
    });
  });

  it("has a localized title and summary for every catalog item", () => {
    for (const locale of locales) {
      const nav = locale.nav as Record<string, unknown>;
      const catalog = locale.publicCatalog as Record<string, unknown>;
      const tools = locale.toolsIndex as { blurbs: Record<string, string> };
      const guides = locale.guidesIndex as { blurbs: Record<string, string> };
      const officer = locale.officerLearning as {
        modules: Record<string, { title?: string; summary?: string }>;
      };
      const deliverables = catalog.deliverables as Record<string, string>;
      const searchTerms = catalog.searchTerms as Record<string, string>;

      for (const item of PUBLIC_CATALOG) {
        const title = item.titleNamespace === "officerLearning"
          ? officer.modules[item.titleKey]?.title
          : nav[item.titleKey];
        expect(typeof title, `${item.id} title`).toBe("string");

        let summary: unknown;
        if (item.summaryNamespace === "toolsIndex") {
          summary = tools.blurbs[item.summaryKey];
        } else if (item.summaryNamespace === "guidesIndex") {
          summary = guides.blurbs[item.summaryKey];
        } else if (item.summaryNamespace === "officerLearning") {
          summary = officer.modules[item.summaryKey]?.summary;
        } else {
          summary = (catalog.summaries as Record<string, string>)[item.summaryKey];
        }
        expect(typeof summary, `${item.id} summary`).toBe("string");
        expect(typeof deliverables[item.deliverableKey], `${item.id} deliverable`).toBe("string");
        if (item.searchTermsKey) {
          expect(typeof searchTerms[item.searchTermsKey], `${item.id} search terms`).toBe("string");
        }

        for (const value of [...item.audiences, ...item.topics, ...item.formats]) {
          expect(value.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps retired destinations out of the sitemap and publishes canonical paths", () => {
    for (const item of PUBLIC_CATALOG) {
      if (item.authRequirement === "signed-in") continue;
      expect(PUBLIC_PATHS).toContain(item.canonicalPath);
      for (const legacyPath of item.legacyPaths) {
        expect(PUBLIC_PATHS).not.toContain(legacyPath);
      }
    }
  });

  it("enforces anonymous, Hub, and disabled-tool visibility", () => {
    const pulsePoll = PUBLIC_CATALOG.find((item) => item.id === "create-pulse-poll");
    expect(pulsePoll?.featureGate).toBe("officerHubPublic");

    const anonymous = visiblePublicCatalog({ authenticated: false, officerHubPublic: true });
    expect(anonymous).not.toContain(pulsePoll);
    expect(visiblePublicCatalog({ authenticated: true, officerHubPublic: false })).not.toContain(pulsePoll);
    expect(visiblePublicCatalog({ authenticated: true, officerHubPublic: true })).toContain(pulsePoll);

    expect(
      visiblePublicCatalog({
        authenticated: false,
        officerHubPublic: false,
        disabledToolSlugs: ["flyer-maker"],
      }).some((item) => item.legacyPaths.includes("/tools/flyer-maker")),
    ).toBe(false);

    expect(PUBLIC_CATALOG.find((item) => item.id === "create-bylaw-builder")?.storageMode)
      .toBe("on-device-hub-optional");
    expect(PUBLIC_CATALOG.find((item) => item.id === "create-proposal-tracker")?.storageMode)
      .toBe("on-device-hub-optional");
  });

  it("resolves curated related content from the same registry", () => {
    const brandKit = PUBLIC_CATALOG.find((item) => item.id === "create-brand-kit");
    expect(relatedCatalogItems(brandKit!).map((item) => item.id)).toEqual([
      "learn-communications-blueprint",
      "learn-first-week",
      "learn-library-brand-assets",
    ]);
  });

  it("resolves breadcrumbs from canonical and legacy catalog paths", () => {
    expect(publicCatalogItemForPath("/tools/flyer-maker")?.canonicalPath)
      .toBe("/create/flyer-maker");
    expect(publicCatalogItemForPath("/guide/running-meetings")?.canonicalPath)
      .toBe("/learn/running-meetings");
  });
});
