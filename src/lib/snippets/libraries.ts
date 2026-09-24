/**
 * Reference CA / constitution libraries offered in the Hub snippet tool.
 * Seed packs ship under these ids; officers can still add local custom clauses
 * (libraryId unset) that appear alongside any selected pack.
 */

export const SNIPPET_LIBRARY_IDS = [
  "caat-a",
  "caat-s-ft",
  "caat-s-pt",
  "constitution",
] as const;

export type SnippetLibraryId = (typeof SNIPPET_LIBRARY_IDS)[number];

export const SNIPPET_LOCALES = ["en", "fr"] as const;
export type SnippetLocale = (typeof SNIPPET_LOCALES)[number];

export function isSnippetLibraryId(value: unknown): value is SnippetLibraryId {
  return (
    typeof value === "string" &&
    (SNIPPET_LIBRARY_IDS as readonly string[]).includes(value)
  );
}

export function isSnippetLocale(value: unknown): value is SnippetLocale {
  return (
    typeof value === "string" &&
    (SNIPPET_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Map Hub collection/`BargainingUnit.code` → default CA pack.
 * Constitution is always selectable separately; Academic is always available.
 */
export function defaultLibraryForBargainingUnitCode(
  code?: string | null,
): SnippetLibraryId {
  const normalized = (code ?? "").trim().toLowerCase();
  if (
    normalized === "pt" ||
    normalized === "ptss" ||
    normalized === "caat-s-pt" ||
    normalized === "part-time"
  ) {
    return "caat-s-pt";
  }
  if (
    normalized === "academic" ||
    normalized === "faculty" ||
    normalized === "caat-a" ||
    normalized === "pl" ||
    normalized === "partial-load"
  ) {
    return "caat-a";
  }
  // FT support (and unknown) → CAAT-S Full-Time
  return "caat-s-ft";
}

/** CSV / seed filenames relative to `seed/snippets/`. */
export const SNIPPET_SEED_FILES: {
  libraryId: SnippetLibraryId;
  locale: SnippetLocale;
  file: string;
}[] = [
  { libraryId: "caat-a", locale: "en", file: "caat-a-academic.en.csv" },
  { libraryId: "caat-s-ft", locale: "en", file: "caat-s-ft.en.csv" },
  { libraryId: "caat-s-pt", locale: "en", file: "caat-s-pt.en.csv" },
  { libraryId: "constitution", locale: "en", file: "constitution.en.csv" },
  // FR packs land later as `*.fr.csv` — registry ready, files optional.
];
