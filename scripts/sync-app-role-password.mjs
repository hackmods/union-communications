#!/usr/bin/env node
/**
 * Sync unionops_app login password after migrations (CapRover / hosts without db-init).
 * Uses MIGRATE_DATABASE_URL (owner role). No-op when POSTGRES_APP_PASSWORD is unset.
 *
 * Loads `postgres` from the migrate-stage node_modules via createRequire — ESM does
 * not honor NODE_PATH, so a bare `import postgres from "postgres"` fails in the
 * production image (standalone runner has no root node_modules).
 */
import { createRequire } from "node:module";
import { join } from "node:path";

const migrateDir = process.env.MIGRATE_DIR?.trim() || "/app/db-migrate";
const require = createRequire(join(migrateDir, "package.json"));
/** @type {typeof import("postgres").default} */
const postgres = require("postgres");

const migrateUrl = process.env.MIGRATE_DATABASE_URL?.trim();
const appPassword = process.env.POSTGRES_APP_PASSWORD?.trim();

if (!migrateUrl || !appPassword) {
  process.exit(0);
}

/** Escape single quotes for PostgreSQL string literals. */
function escapeLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

const sql = postgres(migrateUrl, { max: 1, connect_timeout: 15 });

try {
  const rows = await sql`
    SELECT 1 FROM pg_roles WHERE rolname = 'unionops_app'
  `;
  if (rows.length === 0) {
    console.warn(
      "[sync-app-role] unionops_app role missing — run migrations first (0008_app_role.sql)",
    );
    process.exitCode = 1;
  } else {
    await sql.unsafe(
      `ALTER ROLE unionops_app WITH LOGIN PASSWORD ${escapeLiteral(appPassword)}`,
    );
    console.log(
      "[sync-app-role] unionops_app password synced from POSTGRES_APP_PASSWORD",
    );
  }
} catch (err) {
  console.error(
    "[sync-app-role] failed:",
    err instanceof Error ? err.message : err,
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
