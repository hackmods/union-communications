import type {
  PublicCatalogAudience,
  PublicCatalogFormat,
  PublicCatalogStorage,
  PublicCatalogTopic,
} from "./public-catalog";

export type PublicCatalogQueryState = {
  q: string;
  audience: PublicCatalogAudience | "";
  topic: PublicCatalogTopic | "";
  format: PublicCatalogFormat | "";
  privacy: PublicCatalogStorage | "";
};

const AUDIENCES = new Set<PublicCatalogAudience>([
  "comms",
  "steward",
  "officer",
  "member",
]);
const TOPICS = new Set<PublicCatalogTopic>([
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
]);
const FORMATS = new Set<PublicCatalogFormat>([
  "maker",
  "worksheet",
  "playbook",
  "course",
  "workshop",
  "library",
]);
const STORAGE = new Set<PublicCatalogStorage>([
  "on-device",
  "on-device-hub-optional",
  "officer-hub",
  "none",
]);

function validValue<T extends string>(value: string, values: Set<T>): T | "" {
  return values.has(value as T) ? value as T : "";
}

export function parsePublicCatalogQuery(params: URLSearchParams): PublicCatalogQueryState {
  return {
    q: params.get("q") ?? "",
    audience: validValue(params.get("audience") ?? "", AUDIENCES),
    topic: validValue(params.get("topic") ?? "", TOPICS),
    format: validValue(params.get("format") ?? "", FORMATS),
    privacy: validValue(params.get("privacy") ?? "", STORAGE),
  };
}

export function parsePublicCatalogQueryValues(values: {
  q?: string;
  audience?: string;
  topic?: string;
  format?: string;
  privacy?: string;
}): PublicCatalogQueryState {
  const params = new URLSearchParams();
  for (const key of ["q", "audience", "topic", "format", "privacy"] as const) {
    const value = values[key];
    if (value !== undefined) params.set(key, value);
  }
  return parsePublicCatalogQuery(params);
}

/** Update only catalog-owned parameters, retaining unrelated route context. */
export function updatePublicCatalogQuery(
  existing: URLSearchParams,
  state: PublicCatalogQueryState,
): URLSearchParams {
  const next = new URLSearchParams(existing);
  for (const key of ["q", "audience", "topic", "format", "privacy"] as const) {
    next.delete(key);
    const value = state[key];
    if (value) next.set(key, value);
  }
  return next;
}

/** Accent-insensitive matching keeps French queries forgiving without a service. */
export function normalizeCatalogSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();
}
