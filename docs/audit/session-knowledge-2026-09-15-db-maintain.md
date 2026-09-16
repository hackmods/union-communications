# Session knowledge — 2026-09-15 — db maintainer / platform_meta + data migrations

**What shipped:** a boot-time **db maintainer** (`docker/db-maintain.mjs`, wired from
`docker/entrypoint.sh`) that runs baseline → DDL migrate → version gate → meta upsert →
data migrations, plus a `platform_meta` core setup table and a versioned data-migration
runner (EF `HasData` analog for UnionOps).

## Why it exists

The Drizzle SQL journal (`0000–0034` + `__drizzle_migrations`) already handled DDL
auto-apply on boot. What was missing:

1. An app-readable **version table** — `__drizzle_migrations` stores hashes/timestamps,
   not a "schema is at vN" semantic record or the app version that last touched the DB.
2. **Data migrations** — non-DDL upgrades had no versioned, resumable mechanism (seed was one-shot manual).
3. **Downgrade protection** — Drizzle only applies forward migrations; a boot with an
   *older* image against a newer schema had no refusal.
4. **Concurrency** — `drizzle-kit migrate` takes no advisory lock; replicas could race.

## Design decisions (locked)

- **`platform_meta` lives OUTSIDE the Drizzle journal** — `docker/db-maintain.mjs` ensures
  it with idempotent `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS` (the
  "create/alter" baseline). Hosts on any schema age converge without replaying 0000–0034,
  and future column additions self-heal. Same category as Drizzle's own journal table.
- **Never export `platform.ts` from `src/lib/db/schema/index.ts`** — drizzle-kit generate
  would emit a conflicting journal `CREATE TABLE platform_meta`. Runtime reads it via a
  direct import (`src/lib/db/platform-meta.ts`).
- **Data migrations are SQL files** `src/lib/db/data-migrations/NNNN_description.sql`,
  keyed by `platform_meta.data_version` (strictly greater than applies), each in its own
  transaction, advancing `data_version` only on success → resumable. Forward-only (rollback
  = corrective new file). Owner role (`MIGRATE_DATABASE_URL`) like `db:seed`.
- **Version gate:** applied journal count vs image journal count. DB ahead → refuse
  (`database schema is ahead of this image … deploy a newer image`). Uses `__drizzle_migrations`
  by table name across schemas (Drizzle v7 may not use `public` — session knowledge 2026-08-25).
- **Advisory lock** `pg_advisory_lock(74201234)` session-scoped on the single connection;
  `migrate()` and data transactions run on the same connection so the lock persists.
- DDL migrate uses `drizzle-orm/postgres-js/migrator` `migrate()` (not the CLI binary) —
  drizzle-kit is a devDependency; the slim `db-migrate` install already ships drizzle-orm + postgres.
- Deps loaded via `createRequire(MIGRATE_DIR/package.json)` like `sync-app-role-password.mjs`
  (standalone image has no root node_modules). Run with cwd `/app/db-migrate` so journal/data dirs resolve.

## Ops surface

- Health: `/api/health` → `schemaVersion` / `dataVersion` (null when Postgres off / pre-baseline).
- Local: `npm run db:maintain` (full), `db:data-migrate`, `db:baseline`.
- CI: `scripts/docker-migrate-smoke.sh` asserts maintain log lines + `platform_meta` baseline row;
  `caprover-verify-migrate.sh` now checks `meta_table=1` + `schema_version>0`.
- `ops:verify-durable` runs `db:maintain` then a `platform_meta` read as `unionops_app`.

## Traps seen

- **Fresh DB bug:** first version queried `__drizzle_migrations` before migrate creates it →
  refused to boot. Fixed with `pg_catalog.pg_class` existence check by name (any schema).
- `upsertMeta` must preserve `data_version` (never reset to 0) — read it first, ON CONFLICT UPDATE
  only sets schema/app/applied/migrated.
- MIGRATE_CONTINUE_ON_ERROR remains the only override; version-gate refusal honors it with a warn,
  but skips DDL + data (older image must not touch a newer DB).