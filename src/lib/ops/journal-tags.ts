/**
 * Build-time imported Drizzle journal tag list.
 *
 * The `meta/_journal.json` shipped in the repo at build time is the source of
 * truth for "what migrations does this image know about". Next.js with Turbopack
 * traces static `.json` imports, so this land in the standalone bundle. The
 * runtime probe in `schema-probe.ts` does NOT read `__drizzle_migrations`
 * directly — `unionops_app` has no `drizzle`-schema privileges — so this list
 * is what the probe compares against `platform_meta.applied_migrations`.
 */
import journalJson from "@/lib/db/migrations/meta/_journal.json";

type JournalEntry = { idx: number; tag: string };
type JournalShape = { entries: JournalEntry[] };

const journal = journalJson as unknown as JournalShape;

if (!Array.isArray(journal?.entries)) {
  throw new Error(
    "journal-tags: meta/_journal.json is missing entries — build artifact is broken",
  );
}

export const EXPECTED_JOURNAL_TAGS: readonly string[] = journal.entries.map(
  (e) => e.tag,
);
export const EXPECTED_JOURNAL_COUNT: number = EXPECTED_JOURNAL_TAGS.length;
export const EXPECTED_LAST_IDX: number =
  journal.entries[journal.entries.length - 1].idx;
