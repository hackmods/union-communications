#!/usr/bin/env node
/**
 * UnionOps boot database deployment gate.
 *
 * One contract: validate the shipped Drizzle journal, serialize replicas,
 * apply pending migrations as the owner, prove this image's journal tail, and
 * verify the generated application schema before the web process may start.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ADVISORY_LOCK_KEY = 74201234;
export const JOURNAL_TABLE = "__drizzle_migrations";
export const DEFAULT_JOURNAL_SCHEMA = "drizzle";

function log(message) {
  console.log(`[db-deploy] ${message}`);
}

function warn(message) {
  console.warn(`[db-deploy] WARN: ${message}`);
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

export function bootAttestationPath() {
  return process.env.DB_BOOT_ATTESTATION_PATH?.trim()
    || join(tmpdir(), "unionops-db-boot.json");
}

function clearBootAttestation(path = bootAttestationPath()) {
  try {
    unlinkSync(path);
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) {
      throw error;
    }
  }
}

function writeBootAttestation(value, path = bootAttestationPath()) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  renameSync(temporary, path);
}

/** Validate the image journal as an ordered, one-to-one SQL manifest. */
export function validateJournalManifest(journal, sqlFiles) {
  const entries = journal?.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("migration journal has no entries");
  }

  const tags = new Set();
  const timestamps = new Set();
  let previousWhen = -1;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry || entry.idx !== index) {
      throw new Error(`migration journal idx must be contiguous at ${index}`);
    }
    if (typeof entry.tag !== "string" || !/^\d{4}_[a-z0-9_]+$/.test(entry.tag)) {
      throw new Error(`migration journal entry ${index} has an invalid tag`);
    }
    if (tags.has(entry.tag)) {
      throw new Error(`migration journal has duplicate tag ${entry.tag}`);
    }
    if (!Number.isSafeInteger(entry.when) || entry.when <= previousWhen) {
      throw new Error(`migration journal timestamps must increase at ${entry.tag}`);
    }
    if (timestamps.has(entry.when)) {
      throw new Error(`migration journal has duplicate timestamp ${entry.when}`);
    }
    tags.add(entry.tag);
    timestamps.add(entry.when);
    previousWhen = entry.when;
  }

  const expectedFiles = new Set(entries.map((entry) => `${entry.tag}.sql`));
  const actualFiles = new Set(sqlFiles.filter((file) => /^\d{4}_.+\.sql$/.test(file)));
  for (const file of expectedFiles) {
    if (!actualFiles.has(file)) {
      throw new Error(`migration journal entry is missing SQL file ${file}`);
    }
  }
  for (const file of actualFiles) {
    if (!expectedFiles.has(file)) {
      throw new Error(`migration SQL file is missing from journal: ${file}`);
    }
  }
  return entries;
}

export function readAndValidateJournal(migrationsDir) {
  const journalPath = join(migrationsDir, "meta", "_journal.json");
  if (!existsSync(journalPath)) {
    throw new Error(`migration journal missing at ${journalPath}`);
  }
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  const entries = validateJournalManifest(journal, readdirSync(migrationsDir));
  return { journal, entries };
}

export function expectedJournalTail(migrationsDir, entries) {
  const entry = entries[entries.length - 1];
  const sql = readFileSync(join(migrationsDir, `${entry.tag}.sql`), "utf8");
  return {
    idx: entry.idx,
    tag: entry.tag,
    when: entry.when,
    hash: createHash("sha256").update(sql).digest("hex"),
  };
}

/** Choose one explicit bookkeeping schema; never depend on search_path. */
export function selectJournalSchema(rows) {
  const schemas = [...new Set(rows.map((row) => row.schema))].sort();
  if (schemas.length === 0) return DEFAULT_JOURNAL_SCHEMA;
  if (schemas.length > 1) {
    throw new Error(
      `ambiguous ${JOURNAL_TABLE} tables in schemas: ${schemas.join(", ")}`,
    );
  }
  return schemas[0];
}

export function quoteIdentifier(identifier) {
  if (typeof identifier !== "string" || identifier.length === 0) {
    throw new Error("empty SQL identifier");
  }
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function qualifiedJournalTable(schema) {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(JOURNAL_TABLE)}`;
}

export function journalTailQuery(schema) {
  return `SELECT hash, created_at FROM ${qualifiedJournalTable(schema)} WHERE created_at = $1 AND hash = $2`;
}

async function locateJournalSchemas(sql) {
  return sql`
    SELECT table_schema AS schema
    FROM information_schema.tables
    WHERE table_name = ${JOURNAL_TABLE}
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema
  `;
}

async function proveJournalTail(sql, schema, tail) {
  const rows = await sql.unsafe(journalTailQuery(schema), [tail.when, tail.hash]);
  if (rows.length !== 1) {
    throw new Error(
      `image journal tail ${tail.tag} (${tail.when}) is not recorded in ${schema}.${JOURNAL_TABLE}`,
    );
  }
}

/** Compare the generated contract with catalog rows returned by PostgreSQL. */
export function evaluateRequiredShape(contract, catalog) {
  const errors = [];
  const columnRows = new Map();
  for (const row of catalog.columns ?? []) {
    const key = `${row.table_schema}.${row.table_name}.${row.column_name}`;
    columnRows.set(key, row);
  }

  for (const table of contract.tables ?? []) {
    const tablePrefix = `${contract.schema}.${table.name}.`;
    const tablePresent = [...columnRows.keys()].some((key) => key.startsWith(tablePrefix));
    if (!tablePresent) {
      errors.push(`missing table ${contract.schema}.${table.name}`);
      continue;
    }
    for (const column of table.columns) {
      const key = `${contract.schema}.${table.name}.${column.name}`;
      const actual = columnRows.get(key);
      if (!actual) {
        errors.push(`missing column ${key}`);
        continue;
      }
      if (actual.data_type !== column.dataType) {
        errors.push(`column ${key} type ${actual.data_type}; expected ${column.dataType}`);
      }
      const actualNotNull = actual.is_nullable === "NO";
      if (actualNotNull !== column.notNull) {
        errors.push(
          `column ${key} nullability ${actual.is_nullable}; expected ${column.notNull ? "NO" : "YES"}`,
        );
      }
    }
  }

  const roles = new Map((catalog.roles ?? []).map((row) => [row.name, row]));
  for (const role of contract.roles ?? []) {
    const actual = roles.get(role.name);
    if (!actual) {
      errors.push(`missing database role ${role.name}`);
      continue;
    }
    if (Boolean(actual.superuser) !== Boolean(role.superuser)) {
      errors.push(`role ${role.name} superuser=${actual.superuser}; expected ${role.superuser}`);
    }
    if (Boolean(actual.bypassRls) !== Boolean(role.bypassRls)) {
      errors.push(`role ${role.name} bypassRls=${actual.bypassRls}; expected ${role.bypassRls}`);
    }
  }

  const rls = new Map(
    (catalog.rls ?? []).map((row) => [`${row.schema}.${row.table}`, Boolean(row.enabled)]),
  );
  const policies = new Set(
    (catalog.policies ?? []).map((row) => `${row.schema}.${row.table}.${row.name}`),
  );
  for (const policy of contract.policies ?? []) {
    const tableKey = `${policy.schema}.${policy.table}`;
    if (rls.get(tableKey) !== true) {
      errors.push(`RLS is not enabled on ${tableKey}`);
    }
    const policyKey = `${tableKey}.${policy.name}`;
    if (!policies.has(policyKey)) {
      errors.push(`missing RLS policy ${policyKey}`);
    }
  }
  return errors;
}

async function verifyRequiredShape(sql, contract) {
  const columns = await sql`
    SELECT table_schema, table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = ${contract.schema}
  `;
  const roles = await sql`
    SELECT rolname AS name, rolsuper AS superuser, rolbypassrls AS "bypassRls"
    FROM pg_catalog.pg_roles
  `;
  const rls = await sql`
    SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS enabled
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ${contract.schema}
  `;
  const policies = await sql`
    SELECT schemaname AS schema, tablename AS table, policyname AS name
    FROM pg_catalog.pg_policies
    WHERE schemaname = ${contract.schema}
  `;
  const errors = evaluateRequiredShape(contract, { columns, roles, rls, policies });
  if (errors.length > 0) {
    const preview = errors.slice(0, 20).join("; ");
    const suffix = errors.length > 20 ? `; and ${errors.length - 20} more` : "";
    throw new Error(`required shape verification failed: ${preview}${suffix}`);
  }
  const columnCount = contract.tables.reduce(
    (sum, table) => sum + table.columns.length,
    0,
  );
  return {
    tables: contract.tables.length,
    columns: columnCount,
    policies: contract.policies.length,
  };
}

async function acquireAdvisoryLock(sql) {
  const configured = Number(process.env.MIGRATE_LOCK_TIMEOUT_MS ?? "120000");
  const timeoutMs = Number.isFinite(configured) && configured > 0 ? configured : 120000;
  const deadline = Date.now() + timeoutMs;
  do {
    const rows = await sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS acquired`;
    if (rows[0]?.acquired === true) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  } while (Date.now() < deadline);
  throw new Error(`timed out waiting ${timeoutMs}ms for database deployment lock`);
}

export async function runDatabaseDeploy(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const shippedContract = join(migrateDir(), "db-required-shape.json");
  const migrationsDir = resolve(
    cwd,
    options.migrationsDir ?? process.env.MIGRATIONS_DIR?.trim()
      ?? "src/lib/db/migrations",
  );
  const contractPath = resolve(
    cwd,
    options.contractPath ?? process.env.DB_SCHEMA_CONTRACT?.trim()
      ?? (existsSync(shippedContract)
        ? shippedContract
        : "docker/db-required-shape.json"),
  );
  const ownerUrl = process.env.MIGRATE_DATABASE_URL?.trim();
  const runtimeUrl = process.env.DATABASE_URL?.trim();
  const attestationPath = options.attestationPath ?? bootAttestationPath();

  clearBootAttestation(attestationPath);
  if (!ownerUrl && !runtimeUrl) {
    writeBootAttestation(
      { version: 1, mode: "memory", verified: false, verifiedAt: new Date().toISOString() },
      attestationPath,
    );
    log("no database URLs configured - memory adapters");
    return { skipped: true, mode: "memory" };
  }
  if (!ownerUrl) {
    throw new Error(
      "DATABASE_URL is configured but MIGRATE_DATABASE_URL is missing; refusing DDL through the runtime role",
    );
  }
  if (!existsSync(contractPath)) {
    throw new Error(`required-shape contract missing at ${contractPath}`);
  }

  const { entries } = readAndValidateJournal(migrationsDir);
  const tail = expectedJournalTail(migrationsDir, entries);
  const contract = JSON.parse(readFileSync(contractPath, "utf8"));
  const postgres = loadDependency("postgres");
  const sql = postgres(ownerUrl, {
    max: 1,
    connect_timeout: 15,
    // postgres.js 3.4.x documents `false` as silent but its NoticeResponse
    // fallback still logs when the value is falsy. A no-op callback is the
    // reliable equivalent and keeps expected DDL NOTICEs out of error logs.
    onnotice: () => {},
    connection: { application_name: "unionops-db-deploy" },
  });
  let locked = false;

  try {
    log("connecting with owner migration role");
    await acquireAdvisoryLock(sql);
    locked = true;
    const beforeSchemas = await locateJournalSchemas(sql);
    const journalSchema = selectJournalSchema(beforeSchemas);
    log(`journal schema=${journalSchema}; applying pending migrations`);

    const { migrate } = loadDependency("drizzle-orm/postgres-js/migrator");
    const { drizzle } = loadDependency("drizzle-orm/postgres-js");
    await migrate(drizzle(sql), {
      migrationsFolder: migrationsDir,
      migrationsSchema: journalSchema,
      migrationsTable: JOURNAL_TABLE,
    });

    const afterSchemas = await locateJournalSchemas(sql);
    const verifiedJournalSchema = selectJournalSchema(afterSchemas);
    if (verifiedJournalSchema !== journalSchema) {
      throw new Error(`migration journal moved from ${journalSchema} to ${verifiedJournalSchema}`);
    }
    await proveJournalTail(sql, verifiedJournalSchema, tail);
    const shape = await verifyRequiredShape(sql, contract);
    const attestation = {
      version: 1,
      mode: "postgres",
      verified: true,
      verifiedAt: new Date().toISOString(),
      journalSchema: verifiedJournalSchema,
      tailTag: tail.tag,
      tailIdx: tail.idx,
      tailCreatedAt: tail.when,
      tailHash: tail.hash,
      contractVersion: contract.version,
      ...shape,
    };
    writeBootAttestation(attestation, attestationPath);
    log(
      `verified tail=${tail.tag} schema=${contract.schema} tables=${shape.tables} columns=${shape.columns} policies=${shape.policies}`,
    );
    return attestation;
  } finally {
    if (locked) {
      await sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`.catch(() => {});
    }
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

function debugContinueAllowed() {
  return process.env.MIGRATE_CONTINUE_ON_ERROR === "true"
    && process.env.NODE_ENV !== "production";
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  runDatabaseDeploy().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    if (debugContinueAllowed()) {
      warn(`${message} - continuing only because non-production debug override is set`);
      return;
    }
    if (
      process.env.MIGRATE_CONTINUE_ON_ERROR === "true"
      && process.env.NODE_ENV === "production"
    ) {
      warn("MIGRATE_CONTINUE_ON_ERROR is ignored in production");
    }
    console.error(`[db-deploy] ERROR: ${message}`);
    process.exitCode = 1;
  });
}
