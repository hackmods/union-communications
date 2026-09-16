# Session knowledge — docker migrate smoke failure (2026-09-16)

**Severity.** CI job `docker-migrate-smoke` failed at the entrypoint with:

```
[db-maintain] ERROR: PostgresError: relation __drizzle_migrations does not exist
    at appliedMigrationCount (file:///app/scripts/db-maintain.mjs:193:25)
[entrypoint] ERROR: db maintain failed — refusing to start
```

**Component.** `docker/db-maintain.mjs` → `appliedMigrationCount(sql)`.

## 1. Root cause — Drizzle v0.36+ writes `__drizzle_migrations` to a `drizzle` schema

`drizzle-orm/pg-core/dialect.cjs` (lines 47–57) hard-codes the bookkeeping
schema:

```js
const migrationsSchema = typeof config === "string"
  ? "drizzle"
  : config.migrationsSchema ?? "drizzle";
// …
await session.execute(sql`
  CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`);
```

So fresh `migrate()` runs land the table in `drizzle.__drizzle_migrations`, not
`public.__drizzle_migrations`. The maintainer probe (`SELECT EXISTS … FROM
pg_class WHERE relname = '__drizzle_migrations'`) returned `true` (the table is
in the catalog), but the bare-name count that followed failed because the
non-owner role's `search_path` does **not** include the `drizzle` schema. The
smoke gate misfired right after Drizzle bootstrapped, with the schema in a
legal-but-invisible state for the maintainer.

The five NOTICE messages at the top of the log
(`policy "X_tenant_isolation for relation Y does not exist, skipping`) are
fire-and-forget — `DROP POLICY IF EXISTS` is fussily verbose on a fresh DB
where the policy was just created right above. None of them block boot; they
are safe to ignore. They are NOT the cause of the failure.

## 2. Fix — schema-aware count via `information_schema.tables`

`docker/db-maintain.mjs` `appliedMigrationCount(sql)` now:

1. Reads `table_schema` from `information_schema.tables` (server-controlled
   Postgres metadata — robust across hosts and `search_path` configurations).
2. Schema-qualifies the count: `SELECT count(*) FROM "<schema>"."__drizzle_migrations"`.
3. Returns `0` when the table isn't in any schema (fresh DB), the journal
   count once Drizzle has written it.

The probe query is still bounded (`LIMIT 1`) and returns the first matching
schema in alphabetical order, so a future host that somehow ends up with
both `public.__drizzle_migrations` *and* `drizzle.__drizzle_migrations` will
pick `drizzle` (which is Drizzle's current default).

The bare-name path is **removed**. The function is now exported from
`docker/db-maintain.mjs` so it can be type-checked / unit-tested.

## 3. Tests — `src/lib/db/db-maintain.test.ts` (3 new cases)

Stub-driven scenarios that exercise the three branches:

| Scenario | information_schema returns | Expected | Assertion |
|---|---|---|---|
| Fresh DB (no bookkeeping table yet) | `[]` | `0` | `sql.unsafe` not called |
| Drizzle writes to `drizzle` schema (default config) | `[{ schema: "drizzle" }]` | `35` | `sql.unsafe` called with `"drizzle"."__drizzle_migrations"` + bareName path not touched |
| Legacy / lean — table in `public` schema | `[{ schema: "public" }]` | `12` | `sql.unsafe` called with `"public"."__drizzle_migrations"` |

The stub emits a loud `"bareName count must not be used (DBMAIN-001
regression)"` error if the production code regresses to the bare-name path.
This guards the next change from re-introducing the same bug.

## 4. Lessons learnt

- **L1 — Always schema-qualify when reading a table created in a non-default
  schema.** A bare-name `SELECT FROM "table"` is **not** safe even when the
  table exists; it only works when the table is in `search_path`. Postgres
  roles commonly have `search_path = "$user", public` — the `drizzle`
  schema that Drizzle v0.36+ writes into is not on that list.
- **L2 — `information_schema.tables` is the canonical schema-locator.** It
  reports server-controlled metadata which is the same on every host and is
  reachable regardless of `search_path`. Use it for `IF EXISTS` style
  bookkeeping; the `pg_catalog.pg_class` join is overkill when you only need
  the table's host schema.
- **L3 — Drizzle's `migrationsTable` / `migrationsSchema` config is not
  surfaced by the bare-name API.** The `__drizzle_migrations` table is
  Drizzle's bookkeeping; if you need to count its rows outside
  `drizzle-orm`, probe where it lives. Treat `drizzle-migrator`'s defaults
  as part of the surface area you depend on.
- **L4 — The smoke test was a fresh-DB-only contract.** Single host,
  `postgres:16-alpine`, no `--owner`-role paths other than the role created
  by `docker-compose.yml`. A maintainer that assumes `__drizzle_migrations`
  lives in `public` is wrong against `drizzle-orm@0.36.x` and onward.
- **L5 — One `;DROP POLICY IF EXISTS` of a freshly created policy is
  *expected* verbose noise, not an error.** Suppress it in the mental triage
  — the real failure was on the next `__drizzle_migrations` line. When an
  ERROR follows several NOTICE messages, the NOTICEs are collateral, not
  cause.
- **L6 — The maintainer should be tested with a structural stub.** The
  function signature was widened to `{ unsafe?: (q: string) => Promise<unknown[]> }`
  so tests don't need to reproduce the full `postgres-js` `Sql` surface
  (~17 members). Tests focus on the two query surfaces actually used.

## 5. Forward rules

- **Never** use a bare-name `SELECT FROM "__drizzle_migrations"` outside
  Drizzle itself. Schema-qualify or query via `information_schema.tables`.
- After upgrading `drizzle-orm` (or any related drizzle package), re-run
  `scripts/docker-migrate-smoke.sh` on a fresh volume (delete
  `unionops_pgdata`) to confirm the maintainer still resolves the
  bookkeeping schema.
- If Drizzle changes its default `migrationsSchema`, the
  `information_schema` lookup covers it for free; the maintainer does
  not need to be touched. Only the test's hard-coded schema strings
  (`"drizzle"` / `"public"`) may need refresh.
- The smoke gate's exit-on-error path uses `MIGRATE_CONTINUE_ON_ERROR=true`
  to override for debugging in CI; **never** set it for production —
  silencing the maintainer when Drizzle picks a new schema is the only way
  to mask this class of bug.

## 6. Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm run test:unit` — **1977 passed** (3 new in `db-maintain.test.ts`), 1
  skipped, **0 failed** across 310 files
- Manual smoke path not run in this session (Docker daemon offline); the
  path is exercised end-to-end on the next CI run with a fresh compose
  stack — see `.github/workflows/ci*.yml` for `docker-migrate-smoke` job
  wiring.

## 7. Hand-off

- Anyone editing `docker/db-maintain.mjs` after this: keep the
  `information_schema` probe + schema-qualified count. The stub test fails
  loudly on the bare-name regression.
- Anyone bumping `drizzle-orm` past 0.45.x: re-run the smoke locally
  before pushing. `pg-core/dialect.cjs` `migrationsSchema` default is the
  blast radius.
- Anyone migrating to a different Drizzle driver (e.g. neon-http): the
  bookkeeping schema may again differ. Add a new test variant for that
  driver before merging.
