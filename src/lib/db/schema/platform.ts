/**
 * `platform_meta` — the core setup table (bootstrap metadata, single row id = 1).
 *
 * Lives OUTSIDE the Drizzle migration journal: docker/db-maintain.mjs ensures it on
 * boot with an idempotent CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so
 * hosts on any schema age get a tracked baseline. The Drizzle schema definition here
 * exists so the runtime app can read it (e.g. /api/health) via drizzle-orm.
 *
 * Key fields:
 *  - schema_version        max applied Drizzle migration idx (journal tail after migrate)
 *  - app_version           package.json version of the app that last ran a maintain
 *  - data_version          pointer into src/lib/db/data-migrations (resumable data upgrades)
 *  - applied_migrations    number of applied Drizzle journal entries
 *  - min_app_version       optional downgrade guard hint (not enforced)
 *  - boot_commit_accepted  BUILD_COMMIT_SHA of the image that last completed a
 *                          maintain; lets /api/health detect "we deployed but last
 *                          maintain was an older image" without polling CI.
 */
import { integer, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

export const platformMeta = pgTable("platform_meta", {
  id: smallint("id").primaryKey().default(1),
  schemaVersion: integer("schema_version").notNull().default(0),
  appVersion: text("app_version").notNull().default(""),
  dataVersion: integer("data_version").notNull().default(0),
  appliedMigrations: integer("applied_migrations").notNull().default(0),
  minAppVersion: text("min_app_version"),
  migratedAt: timestamp("migrated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  bootCommitAccepted: text("boot_commit_accepted").notNull().default("unknown"),
});