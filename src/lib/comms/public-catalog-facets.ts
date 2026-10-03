import type {
  PublicCatalogAudience,
  PublicCatalogFormat,
  PublicCatalogItem,
  PublicCatalogStorage,
  PublicCatalogTopic,
} from "./public-catalog";
import type { PublicCatalogQueryState } from "./public-catalog-query";

export type CatalogExplorerMode = "create" | "utilities" | "learn" | "search";

export type CatalogFacetKey = "audience" | "topic" | "format" | "privacy";

const FACET_ORDER = {
  audience: [
    "comms",
    "steward",
    "officer",
    "member",
  ] as const satisfies readonly PublicCatalogAudience[],
  topic: [
    "brand",
    "boards",
    "print",
    "social",
    "web",
    "workplace",
    "grievances",
    "safety",
    "governance",
    "bargaining",
    "training",
    "workshops",
    "accessibility",
  ] as const satisfies readonly PublicCatalogTopic[],
  format: [
    "maker",
    "worksheet",
    "playbook",
    "course",
    "workshop",
    "library",
  ] as const satisfies readonly PublicCatalogFormat[],
  privacy: [
    "on-device",
    "on-device-hub-optional",
    "officer-hub",
    "none",
  ] as const satisfies readonly PublicCatalogStorage[],
};

/** Items shown on a catalog page before facet/search filters. */
export function modeScopedItems(
  items: readonly PublicCatalogItem[],
  mode: CatalogExplorerMode,
): PublicCatalogItem[] {
  return items.filter((item) => {
    if (mode === "create") {
      return item.kind === "tool" && item.toolSurface === "create";
    }
    if (mode === "utilities") {
      return item.kind === "tool" && item.toolSurface === "utilities";
    }
    if (mode === "learn") {
      return item.kind !== "tool";
    }
    return true;
  });
}

export function itemsMatchingFilters(
  items: readonly PublicCatalogItem[],
  state: PublicCatalogQueryState,
  omit?: CatalogFacetKey,
): PublicCatalogItem[] {
  return items.filter((item) => {
    if (
      omit !== "audience" &&
      state.audience &&
      !item.audiences.includes(state.audience)
    ) {
      return false;
    }
    if (
      omit !== "topic" &&
      state.topic &&
      !item.topics.includes(state.topic)
    ) {
      return false;
    }
    if (
      omit !== "format" &&
      state.format &&
      !item.formats.includes(state.format)
    ) {
      return false;
    }
    if (
      omit !== "privacy" &&
      state.privacy &&
      item.storageMode !== state.privacy
    ) {
      return false;
    }
    return true;
  });
}

function uniqueOrdered<T extends string>(
  values: Iterable<T>,
  order: readonly T[],
): T[] {
  const present = new Set(values);
  return order.filter((value) => present.has(value));
}

/** Distinct facet values still reachable given the other active filters. */
export function optionsForFacet(
  items: readonly PublicCatalogItem[],
  facet: CatalogFacetKey,
  state: PublicCatalogQueryState,
): readonly string[] {
  const matched = itemsMatchingFilters(items, state, facet);
  if (facet === "audience") {
    return uniqueOrdered(
      matched.flatMap((item) => item.audiences),
      FACET_ORDER.audience,
    );
  }
  if (facet === "topic") {
    return uniqueOrdered(
      matched.flatMap((item) => item.topics),
      FACET_ORDER.topic,
    );
  }
  if (facet === "format") {
    return uniqueOrdered(
      matched.flatMap((item) => item.formats),
      FACET_ORDER.format,
    );
  }
  return uniqueOrdered(
    matched.map((item) => item.storageMode),
    FACET_ORDER.privacy,
  );
}

/** True when the facet control should render (2+ choices, or 1 while selected). */
export function shouldShowFacet(
  options: readonly string[],
  selected: string,
): boolean {
  if (options.length >= 2) return true;
  if (selected && options.includes(selected)) return true;
  return false;
}
