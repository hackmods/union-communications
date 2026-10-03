import { describe, expect, it } from "vitest";
import { PUBLIC_CATALOG, visiblePublicCatalog } from "./public-catalog";
import {
  isStaleFacetValue,
  itemsMatchingFilters,
  modeScopedItems,
  optionsForFacet,
  shouldShowFacet,
  type CatalogExplorerMode,
  type CatalogFacetKey,
} from "./public-catalog-facets";
import type { PublicCatalogQueryState } from "./public-catalog-query";

const emptyState: PublicCatalogQueryState = {
  q: "",
  audience: "",
  topic: "",
  format: "",
  privacy: "",
};

const available = visiblePublicCatalog({
  authenticated: false,
  officerHubPublic: false,
});

function aloneYieldsResults(
  mode: CatalogExplorerMode,
  facet: CatalogFacetKey,
  value: string,
): boolean {
  const base = modeScopedItems(available, mode);
  const state: PublicCatalogQueryState = {
    ...emptyState,
    ...(facet === "audience" ? { audience: value as PublicCatalogQueryState["audience"] } : {}),
    ...(facet === "topic" ? { topic: value as PublicCatalogQueryState["topic"] } : {}),
    ...(facet === "format" ? { format: value as PublicCatalogQueryState["format"] } : {}),
    ...(facet === "privacy" ? { privacy: value as PublicCatalogQueryState["privacy"] } : {}),
  };
  return itemsMatchingFilters(base, state).length > 0;
}

describe("public-catalog-facets", () => {
  it("scopes Create, Utilities, and Learn to the items on each page", () => {
    const create = modeScopedItems(available, "create");
    const utilities = modeScopedItems(available, "utilities");
    const learn = modeScopedItems(available, "learn");

    expect(create.every((item) => item.kind === "tool" && item.toolSurface === "create")).toBe(true);
    expect(utilities.every((item) => item.kind === "tool" && item.toolSurface === "utilities")).toBe(true);
    expect(learn.every((item) => item.kind !== "tool")).toBe(true);
    expect(create.some((item) => item.id === "create-brand-kit")).toBe(false);
  });

  it("offers only Create facet values that match at least one Create tool alone", () => {
    const create = modeScopedItems(available, "create");
    for (const facet of ["audience", "topic", "format", "privacy"] as const) {
      for (const value of optionsForFacet(create, facet, emptyState)) {
        expect(aloneYieldsResults("create", facet, value), `create ${facet}=${value}`).toBe(true);
      }
    }
    const topics = optionsForFacet(create, "topic", emptyState);
    expect(topics).toEqual(expect.arrayContaining(["brand", "boards", "print", "social", "web"]));
    expect(topics).not.toContain("training");
    expect(optionsForFacet(create, "format", emptyState)).toEqual(["maker"]);
    expect(shouldShowFacet(optionsForFacet(create, "format", emptyState))).toBe(false);
    expect(optionsForFacet(create, "privacy", emptyState)).toEqual(["on-device"]);
    expect(shouldShowFacet(optionsForFacet(create, "privacy", emptyState))).toBe(false);
  });

  it("offers only Utilities facet values that match at least one worksheet alone", () => {
    const utilities = modeScopedItems(available, "utilities");
    for (const facet of ["audience", "topic", "format", "privacy"] as const) {
      for (const value of optionsForFacet(utilities, facet, emptyState)) {
        expect(aloneYieldsResults("utilities", facet, value), `utilities ${facet}=${value}`).toBe(true);
      }
    }
    expect(optionsForFacet(utilities, "topic", emptyState)).toEqual(
      expect.arrayContaining(["workplace", "grievances", "governance", "accessibility"]),
    );
    expect(shouldShowFacet(optionsForFacet(utilities, "format", emptyState))).toBe(false);
  });

  it("offers only Learn facet values that match at least one Learn item alone", () => {
    const learn = modeScopedItems(available, "learn");
    for (const facet of ["audience", "topic", "format", "privacy"] as const) {
      for (const value of optionsForFacet(learn, facet, emptyState)) {
        expect(aloneYieldsResults("learn", facet, value), `learn ${facet}=${value}`).toBe(true);
      }
    }
    expect(optionsForFacet(learn, "audience", emptyState)).not.toContain("member");
    expect(optionsForFacet(learn, "format", emptyState)).not.toContain("maker");
    expect(optionsForFacet(learn, "format", emptyState)).not.toContain("worksheet");
    expect(optionsForFacet(learn, "privacy", emptyState)).not.toContain("officer-hub");
    expect(optionsForFacet(learn, "topic", emptyState)).not.toContain("boards");
    expect(optionsForFacet(learn, "topic", emptyState)).not.toContain("print");
  });

  it("cascades options so a second facet cannot guarantee an empty set", () => {
    const learn = modeScopedItems(available, "learn");
    const withCourse: PublicCatalogQueryState = {
      ...emptyState,
      format: "course",
    };
    const topics = optionsForFacet(learn, "topic", withCourse);
    expect(topics.length).toBeGreaterThan(0);
    for (const topic of topics) {
      const matched = itemsMatchingFilters(learn, { ...withCourse, topic: topic as PublicCatalogQueryState["topic"] });
      expect(matched.length, `course+${topic}`).toBeGreaterThan(0);
    }
  });

  it("hides singleton facets and flags non-narrowing or unreachable selections as stale", () => {
    expect(shouldShowFacet(["maker", "worksheet"])).toBe(true);
    expect(shouldShowFacet(["maker"])).toBe(false);
    expect(shouldShowFacet([])).toBe(false);
    expect(isStaleFacetValue("maker", ["maker"], ["maker"])).toBe(true);
    expect(isStaleFacetValue("boards", ["print", "social"], ["boards", "print", "social"])).toBe(true);
    expect(isStaleFacetValue("print", ["print", "social"], ["boards", "print", "social"])).toBe(false);
    expect(isStaleFacetValue("", ["print"], ["print", "social"])).toBe(false);
  });

  it("marks incompatible facet values as missing from cascaded options", () => {
    const learn = modeScopedItems(available, "learn");
    const topicsForCourse = optionsForFacet(learn, "topic", {
      ...emptyState,
      format: "course",
    });
    // boards/print never appear on Learn; confirm course cascade stays non-empty
    // and never invents tool-only topics.
    expect(topicsForCourse.length).toBeGreaterThan(0);
    expect(topicsForCourse).not.toContain("boards");
    expect(topicsForCourse).not.toContain("print");
  });
});

describe("public-catalog tool topics", () => {
  it("tags Create and Utilities tools with slug-level topics", () => {
    expect(PUBLIC_CATALOG.find((item) => item.id === "create-flyer-maker")?.topics).toEqual(["print"]);
    expect(PUBLIC_CATALOG.find((item) => item.id === "create-board-banner")?.topics).toEqual(["boards"]);
    expect(PUBLIC_CATALOG.find((item) => item.id === "create-graphic-maker")?.topics).toEqual(["social"]);
    expect(PUBLIC_CATALOG.find((item) => item.id === "create-website-template")?.topics).toEqual(["web"]);
    expect(PUBLIC_CATALOG.find((item) => item.id === "utilities-rtw-accommodation")?.topics)
      .toEqual(["accessibility"]);
    expect(PUBLIC_CATALOG.find((item) => item.id === "utilities-grievance-form-builder")?.topics)
      .toEqual(["grievances"]);
    expect(PUBLIC_CATALOG.find((item) => item.id === "utilities-bylaw-builder")?.topics)
      .toEqual(["governance"]);
  });
});
