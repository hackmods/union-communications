/**
 * Runtime schema probe — surfaced by /api/health so operators see whether the
 * live Postgres schema is in sync with this image.
 *
 * What we can probe from `unionops_app` (no `drizzle`-schema grant):
 *  - `platform_meta` row (single row, public schema).
 *  - information_schema lookups for `public` tables we care about.
 *
 * What we can NOT probe from runtime (and how we surface it):
 *  - `__drizzle_migrations` count (lives in `drizzle` schema; only the owner
 *    role can read it). We re-derive "applied count" indirectly from
 *    `platform_meta.applied_migrations` written by docker/db-maintain.mjs
 *    after each successful boot. The runtime cannot enumerate which tags are
 *    applied — that requires the owner role at the migrate step. Operators
 *    who need the explicit tag list should read `__drizzle_migrations`
 *    directly as the owner role.
 *
 * Probe failures never throw. The whole point of /api/health is to expose
 * "DB is reachable but drift exists" without crashing the route.
 */
import { sql } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import {
  EXPECTED_JOURNAL_COUNT,
  EXPECTED_JOURNAL_TAGS,
} from "@/lib/ops/journal-tags";
import {
  readPlatformMeta,
  type PlatformMetaView,
} from "@/lib/db/platform-meta";

/** Column-level expectations for tables we silently depended on. */
export const TASKS_REQUIRED_COLUMNS: readonly string[] = [
  "id",
  "union_id",
  "local_id",
  "title",
  "notes", // added by 0027_hub_social
  "mentioned_user_ids", // added by 0027_hub_social
  "reactions", // added by 0027_hub_social
  "updated_at", // added by 0027_hub_social
];

/** Column-level report: present columns vs. missing ones (subset of expected). */
export type ColumnReport = {
  expected: readonly string[];
  present: readonly string[];
  missing: readonly string[];
};

/** Runtime view exposed by /api/health.schemaProbe. */
export type SchemaProbeView = {
  postgresConfigured: boolean;
  /** Count derived from platform_meta.appliedMigrations; null when no row yet. */
  applied: { count: number | null; source: "platform_meta" | "unknown" };
  expectedJournalCount: number;
  expectedJournalTags: readonly string[];
  /** true when count matches expected AND no critical columns are missing. */
  journalInSync: boolean;
  platformMeta: PlatformMetaView | null;
  criticalColumns: { tasks: ColumnReport };
  /** True if the running image's BUILD_COMMIT_SHA diverges from last maintain. */
  bootCommitMismatch: boolean;
};

const EMPTY_COLUMN_REPORT = (expected: readonly string[]): ColumnReport => ({
  expected,
  present: [],
  missing: [...expected],
});

export async function probeSchema({
  buildCommit,
}: { buildCommit: string }): Promise<SchemaProbeView> {
  if (!isPostgresConfigured()) {
    return {
      postgresConfigured: false,
      applied: { count: null, source: "unknown" },
      expectedJournalCount: EXPECTED_JOURNAL_COUNT,
      expectedJournalTags: EXPECTED_JOURNAL_TAGS,
      journalInSync: true, // no DB = nothing to drift against
      platformMeta: null,
      criticalColumns: {
        tasks: EMPTY_COLUMN_REPORT(TASKS_REQUIRED_COLUMNS),
      },
      bootCommitMismatch: false,
    };
  }

  // Run all of these in parallel; each is independent and bounded to a single
  // round-trip.
  const db = getDb();
  const metaPromise = readPlatformMeta();
  const tasksColumnsPromise = safeProbeColumns({
    tableName: "tasks",
    expected: TASKS_REQUIRED_COLUMNS,
  });

  const [meta, tasksColumns] = await Promise.all([
    metaPromise,
    tasksColumnsPromise,
  ]);

  const appliedCount = meta?.appliedMigrations ?? null;
  const columnsInSync = tasksColumns.missing.length === 0;
  const journalInSync =
    appliedCount !== null &&
    appliedCount === EXPECTED_JOURNAL_COUNT &&
    columnsInSync;

  // Boot-commit divergence: live BUILD_COMMIT_SHA vs platform_meta.bootCommitAccepted.
  // "unknown"/empty on either side counts as NO mismatch (first boot after the
  // column was added shows 'unknown', which is healthy — operators should not
  // alarm just because the legacy row hasn't been touched yet).
  const bootCommitMismatch =
    Boolean(meta?.bootCommitAccepted) &&
    meta!.bootCommitAccepted !== "unknown" &&
    Boolean(buildCommit) &&
    buildCommit !== "unknown" &&
    meta!.bootCommitAccepted !== buildCommit;

  // Keep type-checker happy: applied source is guaranteed for postgres-on paths
  // since meta either resolves or stays null (and we mapped null above).
  void db; // future use (writeability probe gate)

  return {
    postgresConfigured: true,
    applied: { count: appliedCount, source: meta ? "platform_meta" : "unknown" },
    expectedJournalCount: EXPECTED_JOURNAL_COUNT,
    expectedJournalTags: EXPECTED_JOURNAL_TAGS,
    journalInSync,
    platformMeta: meta,
    criticalColumns: { tasks: tasksColumns },
    bootCommitMismatch,
  };
}

async function safeProbeColumns({
  tableName,
  expected,
}: {
  tableName: string;
  expected: readonly string[];
}): Promise<ColumnReport> {
  try {
    const db = getDb();
    // `db.execute` over drizzle-orm/postgres-js returns a RowList<T>; iterate
    //  directly rather than reading `.rows`.
    const result = await db.execute<{ column_name: string }>(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = ${tableName}
    `);
    const rows = Array.isArray(result) ? result : [];
    const present = new Set<string>();
    for (const row of rows) {
      if (row && typeof row.column_name === "string") {
        present.add(row.column_name);
      }
    }
    const presentCols = expected.filter((c) => present.has(c));
    const missingCols = expected.filter((c) => !present.has(c));
    return { expected, present: presentCols, missing: missingCols };
  } catch {
    // Probe failure (transient DB blip, permissions etc.) — report all missing
    // so the health endpoint fails loud rather than passing silently.
    return EMPTY_COLUMN_REPORT(expected);
  }
}
