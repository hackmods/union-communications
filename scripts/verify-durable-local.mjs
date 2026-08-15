#!/usr/bin/env node
/**
 * Local Ops Postgres flip verification (POSTGRES_OPS checklist steps 3–7).
 *
 * Prerequisites:
 *   - docker/.env with AUTH_SECRET, POSTGRES_PASSWORD, POSTGRES_APP_PASSWORD
 *   - `cd docker && docker compose up -d db` (healthy)
 *
 * Runs: migrate → seed → durability-smoke → rls-smoke
 * Does not print secret values.
 *
 * Usage (repo root): node scripts/verify-durable-local.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "docker", ".env");

function loadDockerEnv(file) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${file} — copy docker/.env.example and fill secrets`);
  }
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

function requireKey(env, key) {
  const v = env[key]?.trim();
  if (!v) throw new Error(`docker/.env missing ${key}`);
  return v;
}

function run(label, command, args, env) {
  console.log(`\n[verify-durable] ${label}…`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.stdout?.trim()) process.stdout.write(result.stdout);
  if (result.stderr?.trim()) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status ?? "null"})`);
  }
}

function main() {
  const fileEnv = loadDockerEnv(envPath);
  const password = requireKey(fileEnv, "POSTGRES_PASSWORD");
  const appPassword = requireKey(fileEnv, "POSTGRES_APP_PASSWORD");
  requireKey(fileEnv, "AUTH_SECRET");

  const ownerUrl = `postgres://unionops:${encodeURIComponent(password)}@127.0.0.1:5432/unionops`;
  const appUrl = `postgres://unionops_app:${encodeURIComponent(appPassword)}@127.0.0.1:5432/unionops`;

  const npm = process.platform === "win32" ? "npm.cmd" : "npm";

  // drizzle-kit reads DATABASE_URL (owner for DDL)
  run("db:migrate", npm, ["run", "db:migrate"], {
    DATABASE_URL: ownerUrl,
    MIGRATE_DATABASE_URL: ownerUrl,
  });

  run("db:seed", npm, ["run", "db:seed"], {
    DATABASE_URL: ownerUrl,
    MIGRATE_DATABASE_URL: ownerUrl,
    AUTH_USERS_BACKEND: "postgres",
  });

  run("db:durability-smoke", npm, ["run", "db:durability-smoke"], {
    // Owner URL: proves rows survive reconnect. App-role RLS is db:rls-smoke.
    DATABASE_URL: ownerUrl,
    GRIEVANCE_DB_BACKEND: "postgres",
  });

  run("db:rls-smoke", npm, ["run", "db:rls-smoke"], {
    DATABASE_URL: appUrl,
  });

  console.log("\n[verify-durable] ok — migrate, seed, durability, and RLS smokes passed");
  console.log(
    "[verify-durable] Next: docker compose -f docker-compose.yml -f docker-compose.durable.yml up -d web",
  );
  console.log(
    "[verify-durable] Then: HEALTH_REQUIRE_DURABLE=true npm run health:check",
  );
}

try {
  main();
} catch (err) {
  console.error("[verify-durable] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
