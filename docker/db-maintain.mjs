#!/usr/bin/env node
/**
 * db-maintain — UnionOps boot-time database maintainer (baseline + DDL + data).
 *
 * Runs on container boot (docker/entrypoint.sh) and locally (npm run db:maintain).
 * Extends the existing Drizzle migration pipeline with:
 *
 *   1. BASELINE  — idempotent create/alter of the `platform_meta` core setup table
 *                  (single row, id = 1). Lives OUTSIDE the Drizzle journal on purpose:
 *                  hosts on any schema age get a tracked baseline without re-running
 *                  0000–0034, and later column additions self-heal via ADD COLUMN IF NOT EXISTS.
 *   2. MIGRATE   — DDL via drizzle-orm migrate() (same journal + __drizzle_migrations
 *                  as drizzle-kit, no extra binary in the image).
 *   3. GATE      — refuses to boot an image against a schema that is AHEAD of it
 *                  (downgrade protection): "deploy a newer image".
 *   4. META      — upserts platform_meta (schema_version, app_version, applied_migrations,
 *                  migrated_at) so the DB records the app that last touched it.
 *   5. DATA      — applies pending data migrations (src/lib/db/data-migrations/NNNN_*.sql)
 *                  keyed by platform_meta.data_version. Each runs in its own transaction
 *                  and only advances data_version on success → resumable.
 *
 * Env:
 *   MIGRATE_DATABASE_URL  owner URL (DDL/data migrations); falls back to DATABASE_URL
 *   DATABASE_URL          fallback only — must be a role with DDL rights for migrate
 *   MIGRATE_DIR           dir containing node_modules with drizzle-orm + postgres
 *                         (default: /app/db-migrate, else process.cwd() for local runs)
 *   MIGRATIONS_DIR        Drizzle journal folder (default src/lib/db/migrations)
 *   DATA_MIGRATIONS_DIR   data migration folder (default src/lib/db/data-migrations)
 *   APP_VERSION           optional override for platform_meta.app_version
 *   MIGRATE_CONTINUE_ON_ERROR=true  warn instead of refusing on gate/data failure (debug only)
 *
 * Commands:
 *   maintain     baseline + migrate + gate + meta + data (default)
 *   baseline     ensure platform_meta table + row only
 *   migrate      baseline + DDL migrate + gate + meta upsert (no data)
 *   data-migrate baseline (ensures row) + pending data migrations (no DDL)
 *
 * Pure helpers (parseJournal, sortDataMigrations, pendingDataMigrations, gateDecision,
 * appVersion, BASELINE_SQL, ADVISORY_LOCK_KEY) are exported for unit tests under
 * src/lib/db/db-maintain.test.ts.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Fixed Postgres advisory lock key so concurrent replicas serialize (session-scoped). */
export const ADVISORY_LOCK_KEY = 74201234;

const CONTINUE_ON_ERROR = process.env.MIGRATE_CONTINUE_ON_ERROR === "true";

function migrateDir() {
  const fromEnv = process.env.MIGRATE_DIR?.trim();
  if (fromEnv) return fromEnv;
  if (existsSync("/app/db-migrate/package.json")) return "/app/db-migrate";
  return process.cwd();
}

function loadDep(name) {
  return createRequire(join(migrateDir(), "package.json"))(name);
}

/**
 * Open a postgres.js connection that does not pollute production logs with
 * NOTICE severity lines. The most common offender on a re-boot is Drizzle's
 * bookkeeping CREATE TABLE IF NOT EXISTS — Postgres emits code 42P07
 * (`duplicate_table`) as a NOTICE with the message
 * `relation "__drizzle_migrations" already exists, skipping`. Log aggregators
 * tend to conflate the JSON notice payload with errors; the maintainer
 * routes around that by silencing the onnotice callback in production and
 * surfacing notices via console.warn in debug mode.
 *
 * @param {Function} postgres `require("postgres")` callable
 * @param {string} url owner URL
 * @returns {{ sql: ReturnType<typeof postgres> }}
 */
function openSqlWithQuietNotices(postgres, url) {
  if (CONTINUE_ON_ERROR) {
    // Debug runs: surface every notice via console.warn so the operator sees it.
    return postgres(url, {
      max: 1,
      connect_timeout: 15,
      onnotice: (notice) => {
        warn(`notice: ${notice.message ?? JSON.stringify(notice)}`);
      },
    });
  }
  // Production-safe path: postgres.js `onnotice: false` per
  // node_modules/postgres/README.md:998 ("Default console.log, set false
  // to silence NOTICE"). Boot keeps going — these notices never block —
  // we just stop letting them fan out to stdout.
  return postgres(url, {
    max: 1,
    connect_timeout: 15,
    onnotice: false,
  });
}

function log(...args) {
  console.log(`[db-maintain] ${args.join(" ")}`);
}

function fail(message) {
  console.error(`[db-maintain] ERROR: ${message}`);
  console.error(
    "[db-maintain] set MIGRATE_CONTINUE_ON_ERROR=true to boot anyway (debug only)",
  );
  process.exit(1);
}

function warn(message) {
  console.warn(`[db-maintain] WARN: ${message}`);
}

let cachedAppVersion;
export function appVersion() {
  if (cachedAppVersion) return cachedAppVersion;
  const candidates = [
    process.env.APP_VERSION?.trim(),
    readVersion(join("/app", "package.json")),
    readVersion(join(process.cwd(), "package.json")),
  ];
  cachedAppVersion = candidates.find((v) => v && v !== "unknown") || "unknown";
  return cachedAppVersion;
}

function readVersion(file) {
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    return typeof raw.version === "string" ? raw.version : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Parse the Drizzle journal. Returns { count, lastIdx, tags } where count is the
 * number of journal entries the image knows about, lastIdx is the max migration
 * idx, and tags is the on-disk tag list (`NNNN_description.sql`) for diagnostics.
 * @param {unknown} journal - parsed meta/_journal.json
 */
export function parseJournal(journal) {
  const entries = journal?.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("journal missing entries");
  }
  const lastIdx = entries[entries.length - 1].idx;
  if (typeof lastIdx !== "number") {
    throw new Error("journal last entry missing idx");
  }
  const tags = entries
    .map((e) => (e && typeof e === "object" && typeof e.tag === "string" ? e.tag : null))
    .filter((t) => t !== null);
  return { count: entries.length, lastIdx, tags };
}

/**
 * Parse data-migration file basenames ("NNNN_description.sql") into
 * [{ version, file }] sorted ascending. Non-matching files are skipped.
 * @param {string[]} files
 */
export function sortDataMigrations(files) {
  const entries = [];
  for (const file of files) {
    const match = /^(\d+)_/.exec(file);
    if (!match) {
      warn(`ignoring non-data-migration file in data-migrations dir: ${file}`);
      continue;
    }
    entries.push({ version: Number(match[1]), file });
  }
  entries.sort((a, b) => a.version - b.version);
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].version === entries[i - 1].version) {
      throw new Error(`duplicate data migration version ${entries[i].version}`);
    }
  }
  return entries;
}

/**
 * Migrations still pending for a given data_version (strictly greater).
 * @param {{version:number;file:string}[]} entries
 * @param {number} dataVersion
 */
export function pendingDataMigrations(entries, dataVersion) {
  return entries.filter((e) => e.version > dataVersion);
}

/**
 * Drizzle journal sync decision.
 * @param {{appliedBefore:number; expectedCount:number}} input
 * @returns {"ahead"|"behind"|"in-sync"}
 */
export function gateDecision({ appliedBefore, expectedCount }) {
  if (appliedBefore > expectedCount) return "ahead";
  if (appliedBefore < expectedCount) return "behind";
  return "in-sync";
}

/** Idempotent create/alter of the platform_meta core setup table (baseline). */
export const BASELINE_SQL = `
CREATE TABLE IF NOT EXISTS "platform_meta" (
  "id" smallint PRIMARY KEY DEFAULT 1 CHECK ("id" = 1)
);
ALTER TABLE "platform_meta" ADD COLUMN IF NOT EXISTS "schema_version" integer NOT NULL DEFAULT 0;
ALTER TABLE "platform_meta" ADD COLUMN IF NOT EXISTS "app_version" text NOT NULL DEFAULT '';
ALTER TABLE "platform_meta" ADD COLUMN IF NOT EXISTS "data_version" integer NOT NULL DEFAULT 0;
ALTER TABLE "platform_meta" ADD COLUMN IF NOT EXISTS "applied_migrations" integer NOT NULL DEFAULT 0;
ALTER TABLE "platform_meta" ADD COLUMN IF NOT EXISTS "min_app_version" text;
ALTER TABLE "platform_meta" ADD COLUMN IF NOT EXISTS "migrated_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "platform_meta" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
ALTER TABLE "platform_meta" ADD COLUMN IF NOT EXISTS "boot_commit_accepted" text NOT NULL DEFAULT 'unknown';
INSERT INTO "platform_meta" ("id") VALUES (1) ON CONFLICT DO NOTHING;
`;

async function runBaseline(sql) {
  await sql.begin(async (tx) => {
    await tx.unsafe(BASELINE_SQL);
  });
  log("baseline ok (platform_meta ensured)");
}

/**
 * Round the count of applied Drizzle migrations for the gate decision.
 *
 * Round 2 (Drizzle v0.36+) stores its bookkeeping table inside a dedicated
 * `drizzle` schema — see `drizzle-orm/pg-core/dialect.cjs` line ~48
 * (`migrationsSchema ?? "drizzle"`). Older builds and lean configs which pass
 * `migrationsSchema: "public"` keep the table in the role's main schema —
 * typically `public`.
 *
 * Round 3 must read the table **schema-qualified**: a bare-name
 * `SELECT FROM "__drizzle_migrations"` raises
 * `relation "__drizzle_migrations" does not exist` whenever the role's
 * `search_path` does not include the schema Drizzle picked (`drizzle` for the
 * default config). Without schema qualification the maintainer fails on a
 * fresh DB right after Drizzle creates the bookkeeping table — the smoke
 * gate misfires before the boot can complete.
 *
 * `information_schema.tables` is server-controlled Postgres metadata, so the
 * schema lookup is robust across hosts and search_path configurations.
 *
 * Exported for unit tests in `src/lib/db/db-maintain.test.ts`.
 *
 * @param {{ unsafe?: (q: string) => Promise<unknown[]> }} sql postgres.js tagged-template handle
 *        (structurally typed so unit tests can pass a loose stub)
 * @returns {Promise<number>} 0 when no migrations table exists in any schema
 */
export async function appliedMigrationCount(sql) {
  const located = await sql`
    SELECT "table_schema" AS schema
    FROM information_schema.tables
    WHERE "table_name" = '__drizzle_migrations'
      AND "table_type" = 'BASE TABLE'
    ORDER BY "table_schema"
    LIMIT 1
  `;
  if (!located.length) return 0;
  // `table_schema` comes from the server catalog, not user input, so it is
  // safe to inline as a quoted identifier.
  const schema = located[0].schema;
  const rows = await sql.unsafe(
    `SELECT count(*)::int AS n FROM "${schema}"."__drizzle_migrations"`,
  );
  return rows.length ? rows[0].n : 0;
}

async function runMigrate(sql, migrationsDir, expectedCount) {
  const appliedBefore = await appliedMigrationCount(sql);
  const decision = gateDecision({ appliedBefore, expectedCount });

  if (decision === "ahead") {
    const message = `database schema is ahead of this image (applied ${appliedBefore} > journal ${expectedCount}) — deploy a newer image`;
    warn(`schema_ahead applied=${appliedBefore} journal=${expectedCount}`);
    if (CONTINUE_ON_ERROR) {
      warn(`${message} — continuing (MIGRATE_CONTINUE_ON_ERROR=true)`);
      return { decision, schemaVersion: null, applied: appliedBefore };
    }
    fail(message);
  }

  if (decision === "behind") {
    const { migrate } = loadDep("drizzle-orm/postgres-js/migrator");
    const { drizzle } = loadDep("drizzle-orm/postgres-js");
    const db = drizzle(sql, {});
    await migrate(db, { migrationsFolder: migrationsDir });
    const appliedAfter = await appliedMigrationCount(sql);
    if (appliedAfter !== expectedCount) {
      const message = `migrate finished but applied count ${appliedAfter} != journal ${expectedCount}`;
      if (CONTINUE_ON_ERROR) {
        warn(`${message} — continuing (MIGRATE_CONTINUE_ON_ERROR=true)`);
      } else {
        fail(message);
      }
    }
    log(`migrate ok (applied ${appliedAfter}/${expectedCount})`);
    const nowApplied = expectedCount - appliedBefore;
    if (nowApplied > 0) {
      log(`migrations applied this boot: ${nowApplied} (count ${appliedBefore} -> ${appliedAfter})`);
    }
    return { decision, schemaVersion: expectedCount - 1, applied: appliedAfter };
  }

  // in-sync — journal tail is the current max idx
  log(`migrate ok (in-sync, ${appliedBefore} applied)`);
  return { decision, schemaVersion: expectedCount - 1, applied: appliedBefore };
}

async function upsertMeta(sql, { schemaVersion, applied, dataVersion = 0 }) {
  const version = appVersion();
  const buildCommit = process.env.BUILD_COMMIT_SHA?.trim() || "unknown";
  const rows = await sql`SELECT data_version FROM "platform_meta" WHERE id = 1`;
  const currentDataVersion = rows.length ? rows[0].data_version : dataVersion;
  await sql`
    INSERT INTO "platform_meta" (id, schema_version, app_version, data_version, applied_migrations, migrated_at, updated_at, boot_commit_accepted)
    VALUES (1, ${schemaVersion}, ${version}, ${currentDataVersion}, ${applied}, now(), now(), ${buildCommit})
    ON CONFLICT (id) DO UPDATE SET
      schema_version = EXCLUDED.schema_version,
      app_version = EXCLUDED.app_version,
      applied_migrations = EXCLUDED.applied_migrations,
      migrated_at = EXCLUDED.migrated_at,
      updated_at = now(),
      boot_commit_accepted = EXCLUDED.boot_commit_accepted
  `;
  log(`meta upserted (schema v${schemaVersion}, app ${version}, migrations ${applied}, boot_commit ${buildCommit})`);
  return currentDataVersion;
}

async function runDataMigrations(sql, dataMigrationsDir, currentDataVersion) {
  if (!existsSync(dataMigrationsDir)) {
    log(`data-migrate ok (no data-migrations dir at ${dataMigrationsDir})`);
    return { applied: 0, at: currentDataVersion };
  }
  const files = readdirSync(dataMigrationsDir).filter((f) => f.endsWith(".sql"));
  const sorted = sortDataMigrations(files);
  const pending = pendingDataMigrations(sorted, currentDataVersion);
  if (pending.length === 0) {
    log(`data-migrate ok (data v${currentDataVersion}, nothing pending)`);
    return { applied: 0, at: currentDataVersion };
  }
  for (const m of pending) {
    try {
      const fileContent = readFileSync(join(dataMigrationsDir, m.file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(fileContent);
        await tx`
          UPDATE "platform_meta" SET data_version = ${m.version}, updated_at = now() WHERE id = 1
        `;
      });
      log(`data migration ${m.version} (${m.file}) applied`);
    } catch (err) {
      const message = `data migration ${m.version} (${m.file}) failed: ${
        err instanceof Error ? err.message : err
      }`;
      if (CONTINUE_ON_ERROR) {
        warn(`${message} — continuing (MIGRATE_CONTINUE_ON_ERROR=true)`);
        break;
      }
      fail(message);
    }
  }
  return { applied: pending.length, at: currentDataVersion + pending.length };
}

export async function runMaintain(opts = {}) {
  const command = opts.command ?? "maintain";
  const migrationsDir = resolve(
    opts.cwd ?? process.cwd(),
    opts.migrationsDir ?? process.env.MIGRATIONS_DIR?.trim() ?? "src/lib/db/migrations",
  );
  const dataMigrationsDir = resolve(
    opts.cwd ?? process.cwd(),
    opts.dataMigrationsDir ??
      process.env.DATA_MIGRATIONS_DIR?.trim() ??
      "src/lib/db/data-migrations",
  );
  const url =
    process.env.MIGRATE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (!url) {
    log("no MIGRATE_DATABASE_URL / DATABASE_URL — skipping (memory adapters)");
    return { skipped: true };
  }
  if (!existsSync(join(migrationsDir, "meta", "_journal.json"))) {
    fail(`migrations folder missing at ${migrationsDir}`);
  }

  const postgres = loadDep("postgres");
  // postgres.js defaults to `console.log` for NOTICE severities (see
  // node_modules/postgres/README.md:998). That surfaces `CREATE TABLE IF
  // NOT EXISTS drizzle.__drizzle_migrations already exists, skipping` as a
  // JSON notice on every boot after the first successful migrate. Boot
  // keeps going — the message is informational, code 42P07 — but log
  // aggregators tend to alarm on severity "NOTICE" when collectors
  // conflate JSON notice lines with errors. See openSqlWithQuietNotices
  // for the suppression policy.
  const sql = openSqlWithQuietNotices(postgres, url);
  log(`connecting as owner role (${command})`);

  try {
    await sql`SELECT pg_advisory_lock(${ADVISORY_LOCK_KEY})`;

    await runBaseline(sql);

    if (command === "baseline") {
      log("baseline finished");
      return { baseline: true };
    }

    if (command === "migrate" || command === "maintain") {
      const journal = JSON.parse(
        readFileSync(join(migrationsDir, "meta", "_journal.json"), "utf8"),
      );
      const { count } = parseJournal(journal);
      const migrateResult = await runMigrate(sql, migrationsDir, count);
      if (migrateResult.decision === "ahead") {
        // Refused or continue-on-error; nothing else to do safely with an older image.
        return migrateResult;
      }
      const dataVersion = await upsertMeta(sql, migrateResult);
      if (command === "maintain") {
        const dataResult = await runDataMigrations(sql, dataMigrationsDir, dataVersion);
        log(
          `maintain finished (schema v${migrateResult.schemaVersion}, data v${dataResult.at})`,
        );
        return { ...migrateResult, ...dataResult };
      }
      log(`migrate command finished (schema v${migrateResult.schemaVersion})`);
      return migrateResult;
    }

    if (command === "data-migrate") {
      const rows = await sql`SELECT data_version FROM "platform_meta" WHERE id = 1`;
      const dataVersion = rows.length ? rows[0].data_version : 0;
      const dataResult = await runDataMigrations(sql, dataMigrationsDir, dataVersion);
      log(`data-migrate finished (data v${dataResult.at})`);
      return dataResult;
    }

    fail(`unknown command: ${command}`);
  } finally {
    await sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`.catch(() => {});
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

// Run only when executed directly (not when imported by tests).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const command = process.argv[2] ?? "maintain";
  runMaintain({ command }).catch((err) => {
    console.error(
      "[db-maintain] ERROR:",
      err instanceof Error ? err.stack ?? err.message : err,
    );
    process.exit(1);
  });
}