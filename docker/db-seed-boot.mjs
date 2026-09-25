#!/usr/bin/env node
/**
 * Boot-time reference-tenant seed (CapRover / production entrypoint).
 *
 * Schema migrate stays separate (db-deploy.mjs). This upserts the B7P demo
 * reference union/locals only — never demo roster users or platform admin
 * (those stay on npm run db:seed / caprover-bootstrap-seed.sh).
 *
 * SEED_ON_BOOT:
 *   auto  (default) — seed only when unions has zero rows
 *   true            — always upsert reference tenant (idempotent)
 *   false / off / 0 — skip
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

function log(message) {
  console.log(`[db-seed-boot] ${message}`);
}

function migrateDir() {
  const configured = process.env.MIGRATE_DIR?.trim();
  if (configured) return configured;
  if (existsSync("/app/db-migrate/package.json")) return "/app/db-migrate";
  return process.cwd();
}

function loadDependency(name) {
  return createRequire(join(migrateDir(), "package.json"))(name);
}

/** @param {string | undefined} raw */
export function resolveSeedOnBootMode(raw = process.env.SEED_ON_BOOT) {
  const value = (raw ?? "auto").trim().toLowerCase();
  if (value === "false" || value === "0" || value === "off" || value === "no") {
    return "false";
  }
  if (value === "true" || value === "1" || value === "yes" || value === "always") {
    return "true";
  }
  return "auto";
}

export function resolveSeedJsonPath() {
  const fromEnv = process.env.SEED_REFERENCE_TENANT_PATH?.trim();
  if (fromEnv) return fromEnv;
  if (existsSync("/app/seed/reference-tenant-b7p.json")) {
    return "/app/seed/reference-tenant-b7p.json";
  }
  return resolve(process.cwd(), "seed/reference-tenant-b7p.json");
}

/** @param {string} path */
export function loadReferenceTenantSeed(path = resolveSeedJsonPath()) {
  if (!existsSync(path)) {
    throw new Error(`reference tenant seed missing at ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * @param {import("postgres").Sql} sql
 * @param {ReturnType<typeof loadReferenceTenantSeed>} seed
 */
export async function upsertReferenceTenant(sql, seed) {
  await sql`
    INSERT INTO unions (id, name, slug, default_locale, enabled_modules, is_demo)
    VALUES (
      ${seed.union.id},
      ${seed.union.name},
      ${seed.union.slug},
      ${seed.union.defaultLocale ?? "en"},
      ${sql.json(seed.union.enabledModules)},
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      default_locale = EXCLUDED.default_locale,
      enabled_modules = EXCLUDED.enabled_modules,
      is_demo = true
  `;

  await sql`
    INSERT INTO divisions (id, union_id, name, code, enabled_modules, is_demo)
    VALUES (
      ${seed.division.id},
      ${seed.division.unionId},
      ${seed.division.name},
      ${seed.division.code},
      ${sql.json(seed.division.enabledModules)},
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      union_id = EXCLUDED.union_id,
      name = EXCLUDED.name,
      code = EXCLUDED.code,
      enabled_modules = EXCLUDED.enabled_modules,
      is_demo = true
  `;

  for (const local of seed.locals ?? []) {
    await sql`
      INSERT INTO locals (id, union_id, division_id, local_number, sub_text, is_demo)
      VALUES (
        ${local.id},
        ${local.unionId},
        ${local.divisionId ?? null},
        ${local.localNumber},
        ${local.subText ?? ""},
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        union_id = EXCLUDED.union_id,
        division_id = EXCLUDED.division_id,
        local_number = EXCLUDED.local_number,
        sub_text = EXCLUDED.sub_text,
        is_demo = true
    `;
  }

  for (const bu of seed.bargainingUnits ?? []) {
    await sql`
      INSERT INTO bargaining_units (id, union_id, local_id, code, name, grievance_config)
      VALUES (
        ${bu.id},
        ${bu.unionId},
        ${bu.localId},
        ${bu.code},
        ${bu.name},
        ${bu.grievanceConfig ? sql.json(bu.grievanceConfig) : null}
      )
      ON CONFLICT (id) DO UPDATE SET
        union_id = EXCLUDED.union_id,
        local_id = EXCLUDED.local_id,
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        grievance_config = EXCLUDED.grievance_config
    `;
  }
}

export async function countUnions(sql) {
  const rows = await sql`SELECT count(*)::int AS count FROM unions`;
  return Number(rows[0]?.count ?? 0);
}

export async function runBootSeed(env = process.env) {
  const mode = resolveSeedOnBootMode(env.SEED_ON_BOOT);
  if (mode === "false") {
    log("skipped (SEED_ON_BOOT=false)");
    return { skipped: true, reason: "disabled" };
  }

  const ownerUrl = env.MIGRATE_DATABASE_URL?.trim() || env.DATABASE_URL?.trim();
  if (!ownerUrl) {
    log("skipped (no MIGRATE_DATABASE_URL / DATABASE_URL)");
    return { skipped: true, reason: "no_database_url" };
  }

  const postgres = loadDependency("postgres");
  const sql = postgres(ownerUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    onnotice: () => {},
  });

  try {
    const unionCount = await countUnions(sql);
    if (mode === "auto" && unionCount > 0) {
      log(`skipped (auto; unions already has ${unionCount} row(s))`);
      return { skipped: true, reason: "already_seeded", unionCount };
    }

    const seed = loadReferenceTenantSeed();
    await upsertReferenceTenant(sql, seed);
    const after = await countUnions(sql);
    log(
      `upserted reference tenant ${seed.union.slug} (${seed.locals?.length ?? 0} locals, ${seed.bargainingUnits?.length ?? 0} collections); unions=${after}`,
    );
    return {
      skipped: false,
      unionId: seed.union.id,
      unionCount: after,
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  /db-seed-boot(\.mjs)?$/i.test(process.argv[1].replace(/\\/g, "/"));

if (isDirectRun) {
  runBootSeed().catch((err) => {
    console.error("[db-seed-boot] failed:", err);
    process.exitCode = 1;
  });
}
