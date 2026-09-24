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

  for (const pack of SNIPPET_SEED_FILES) {
    const path = resolve(seedDir, pack.file);
    if (!existsSync(path)) continue;
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
  return rows;
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
