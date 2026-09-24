import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSnippetCsv } from "./bulk-parse";
import {
  SNIPPET_SEED_FILES,
  type SnippetLibraryId,
  type SnippetLocale,
} from "./libraries";
import type { CaSnippet, CreateCaSnippetInput } from "@/types/qol";

const SEED_AUTHOR = {
  createdById: "system-seed",
  createdByName: "UnionOps seed",
} as const;

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Stable id so Postgres upserts and memory resets stay idempotent. */
export function seedSnippetId(
  libraryId: SnippetLibraryId,
  locale: SnippetLocale,
  clauseRef: string,
  title: string,
): string {
  return `snip-pack-${libraryId}-${locale}-${slugPart(clauseRef)}-${slugPart(title)}`;
}

export function loadSnippetSeedPackInputs(options?: {
  seedDir?: string;
}): (CreateCaSnippetInput & {
  libraryId: SnippetLibraryId;
  locale: SnippetLocale;
})[] {
  const seedDir = options?.seedDir ?? resolve(process.cwd(), "seed/snippets");
  const rows: (CreateCaSnippetInput & {
    libraryId: SnippetLibraryId;
    locale: SnippetLocale;
  })[] = [];
  let missing = 0;

  for (const pack of SNIPPET_SEED_FILES) {
    const path = resolve(seedDir, pack.file);
    if (!existsSync(path)) {
      missing += 1;
      continue;
    }
    const csv = readFileSync(path, "utf8");
    for (const row of parseSnippetCsv(csv)) {
      rows.push({
        ...row,
        libraryId: pack.libraryId,
        locale: pack.locale,
        // Union-wide reference packs — visible to every local/collection.
        localId: undefined,
        bargainingUnitId: undefined,
      });
    }
  }

  if (missing > 0 && rows.length === 0) {
    console.warn(
      `[snippets] No seed CSVs found under ${seedDir} (${missing} pack file(s) missing). Runtime reseed will restore 0 rows.`,
    );
  } else if (missing > 0) {
    console.warn(
      `[snippets] ${missing} of ${SNIPPET_SEED_FILES.length} seed pack file(s) missing under ${seedDir}.`,
    );
  }

  return rows;
}

/** How many registered seed CSV files are present on disk. */
export function countAvailableSnippetSeedFiles(options?: {
  seedDir?: string;
}): { available: number; expected: number; seedDir: string } {
  const seedDir = options?.seedDir ?? resolve(process.cwd(), "seed/snippets");
  let available = 0;
  for (const pack of SNIPPET_SEED_FILES) {
    if (existsSync(resolve(seedDir, pack.file))) available += 1;
  }
  return { available, expected: SNIPPET_SEED_FILES.length, seedDir };
}

export function buildSeedSnippets(unionId: string): CaSnippet[] {
  const now = new Date().toISOString();
  return loadSnippetSeedPackInputs().map((input) => ({
    id: seedSnippetId(
      input.libraryId,
      input.locale,
      input.clauseRef,
      input.title,
    ),
    unionId,
    localId: undefined,
    bargainingUnitId: undefined,
    libraryId: input.libraryId,
    locale: input.locale,
    title: input.title,
    clauseRef: input.clauseRef,
    body: input.body,
    tags: input.tags ?? [],
    createdById: SEED_AUTHOR.createdById,
    createdByName: SEED_AUTHOR.createdByName,
    createdAt: now,
    updatedAt: now,
  }));
}
