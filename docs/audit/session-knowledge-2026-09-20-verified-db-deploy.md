# Session knowledge — 2026-09-20 — verified database deploy gate

**Decision:** [ADR-020](adr-020-database-deployment-contract.md) replaces the 2026-09-15 maintainer contract. The Drizzle journal is the only upgrade ledger.

## Production contract

```text
image journal + generated shape
        │
validate → advisory lock → migrate as owner → prove exact tail → verify shape
                                                                    │
                                                       pass → serve; fail → exit 1
```

- `MIGRATE_DATABASE_URL` owns DDL; `DATABASE_URL` is the limited `unionops_app` role and must remain subject to RLS.
- `docker/db-deploy.mjs` discovers `__drizzle_migrations` through `information_schema`, rejects multiple copies, and always uses an explicit schema. Never depend on `search_path`.
- The gate validates a one-to-one, contiguous journal/file manifest before connecting. CI also checks append-only history against the PR base with `npm run db:check -- --base <ref>`.
- The image build generates `docker/db-required-shape.json` from the Drizzle schema plus the RLS contract. Boot verifies every required table/column type/nullability, the app role's non-superuser/non-bypass posture, RLS enablement, and named policies.
- Exact tail means the last image journal timestamp and SQL SHA-256 both exist in the selected ledger. A count is not proof.
- A boot attestation is written only after verification. `/api/health` reports it as `databaseDeployment`; configured Postgres without verified evidence is degraded/HTTP 503.
- Concurrent replicas use advisory lock `74201234`, bounded by `MIGRATE_LOCK_TIMEOUT_MS` (default 120000 ms).
- Production is fail-closed. `MIGRATE_CONTINUE_ON_ERROR=true` is ignored in `NODE_ENV=production`; it exists only for local debugging.
- postgres.js 3.4 documents `onnotice: false`, but its falsy branch logs. The runner uses an empty `onnotice` callback, proven quiet by the image smoke.

## Compatibility and retirement

- Migrations `0000`–`0035` were not edited, squashed, renumbered, or regenerated.
- `0036_verified_boot_reconcile.sql` is forward-only and idempotently repairs the known 0027–0029 journal-hole shapes, performs the former site-admin data backfill, then drops obsolete `platform_meta`.
- Deleted: `docker/db-maintain.mjs`, `platform_meta` runtime/schema code, the separate `src/lib/db/data-migrations` runner/files, `boot_commit_accepted` state, and the old asynchronous schema probe.
- Future bounded data massage belongs in its forward Drizzle SQL migration. Large/online transformations require a new explicit expand/backfill/contract design; do not recreate a second version ledger.
- No database URLs still means memory adapters and a memory-mode attestation.

## Deployment and proof

- Production contract is CapRover Method 3 pulling the CI-built GHCR image. Method 1 on-droplet builds remain out of contract because of observed OOM/old-image drift.
- `scripts/docker-migrate-smoke.sh` proves: fresh volume; all four 0027 task columns; one schema-qualified journal; no `platform_meta`; historical 33/36 repair with sentinel data preserved; concurrent no-op boots; quiet NOTICE handling; and damaged critical DDL exiting 1 before the server command.
- 2026-09-20 verification: Docker smoke, production build, typecheck, lint, and migration integrity passed. Full Vitest is green: 313 files, 1,990 passed, 1 skipped. Five CPU-heavy PDF cases have targeted 15 s budgets so full-suite concurrency no longer trips the default 5 s limit.

## Operator signal

Successful logs end with:

```text
[db-deploy] verified tail=0037_b7p_demo_tenant schema=public tables=60 columns=697 policies=43
[entrypoint] database deploy gate passed
```

If the gate names a missing column/policy/role or ambiguous ledger, do not bypass it. Restore the expected forward shape or deploy the correct image.
