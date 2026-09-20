# ADR-020: Verified, forward-only database deployments

**Status:** Accepted  
**Date:** 2026-09-19  
**Scope:** Production PostgreSQL boot migrations and rolling image deploys

## Context

The current maintainer has three competing authorities: Drizzle's journal,
`platform_meta`, and a separate data-migration pointer. They can disagree while
the app still serves. On 2026-09-19, live `/api/health` reported schema version
35 and the current boot commit, but only 33/36 journal rows and the four
`tasks` columns from `0027_hub_social` were absent. A migration count therefore
does not prove that the schema required by the application exists.

UnionOps needs automatic forward upgrades from every released Drizzle-managed
database, safe concurrent replica starts, bounded data repair, and refusal to
serve when the running image's database contract is not satisfied. It does not
promise automatic destructive downgrade.

## Decision

Use one upgrade ledger: the append-only Drizzle SQL journal. Put DDL and bounded,
idempotent data transformations in the same numbered migration. A thin boot
runner uses the owner connection, serializes replicas with a PostgreSQL advisory
lock, applies pending migrations, and verifies the image's required schema
shape before starting Next.js. Any failure exits non-zero.

The required-shape artifact is generated from the application's Drizzle schema
at image build time, with explicit security invariants for objects Drizzle does
not model (RLS policies and the runtime role). It is a derived boot contract,
not a second version ledger. Verification is subset-based: required objects
must match, while newer additive objects may exist for rolling compatibility.

```text
PR: SQL + journal -> append-only/bijection check -> fresh-DB migrate + verify
                                      |
Image: slim /app/db-migrate + journal + generated required-shape contract
                                      |
Boot: owner connect -> advisory lock -> Drizzle migrate -> verify -> unlock
                                                               | fail
                                                               +----> exit 1
                                      |
                         runtime DATABASE_URL (unionops_app + RLS) -> serve
```

## Boot contract (pseudocode)

```text
if neither DB URL is set: record memory mode; exec server
if DATABASE_URL is set and MIGRATE_DATABASE_URL is absent: exit 1
connect MIGRATE_DATABASE_URL as owner with onnotice=false
acquire advisory lock with a bounded wait
locate __drizzle_migrations through information_schema
if more than one journal table exists: exit 1
select target schema (existing schema, otherwise explicit "drizzle")
run Drizzle migrate with that schema and the shipped journal
assert the image's tail timestamp + SQL hash exists in the qualified journal
verify generated tables, columns, types/nullability, role and RLS invariants
write a non-authoritative boot attestation for /api/health
release lock and close owner connection
exec server; on any migrate/verify error, exit 1
```

## Rolling-update rules

- Schema changes use expand -> migrate/read-both -> contract across releases.
  A deploy must remain compatible with the previously serving image; destructive
  renames/drops never share a release with first use of the replacement.
- Small deterministic backfills live in their Drizzle migration and transaction.
  A future large/batched backfill system needs its own ADR, idempotency keys,
  progress table, and readiness gate; the current parallel data runner is not it.
- Extra journal rows or additive schema do not fail an older compatible image.
  The runner proves its own tail migration and required shape instead of using
  an ahead/behind count gate.
- `MIGRATE_CONTINUE_ON_ERROR` is a local/debug escape only and is ignored in
  production. Configured production PostgreSQL always fails closed.
- `MIGRATE_DATABASE_URL` is the only DDL/DML credential. `DATABASE_URL` remains
  the limited `unionops_app` runtime credential so RLS is exercised.

## Keep / kill

| Surface | Decision | Reason / transition |
|---|---|---|
| `src/lib/db/migrations/*.sql` + `_journal.json` | **Keep unchanged; append only** | Sole upgrade history; never squash, renumber, regenerate, or edit released entries. |
| Slim `/app/db-migrate` install | **Keep** | Avoids cross-stage `node_modules` copies and CapRover BuildKit failures. |
| Advisory lock | **Keep, bound the wait** | Serializes concurrent replica boot without indefinite startup hangs. |
| Schema-aware journal lookup + `onnotice: false` | **Keep** | Eliminates `search_path` assumptions and NOTICE-as-error noise. |
| `platform_meta` schema/data versions | **Kill** | Duplicates journal state and produced false confidence on the live host. Drop through a new forward migration after health readers are replaced. |
| `src/lib/db/data-migrations/` runner | **Kill** | Fold its idempotent `0001` backfill into the reconciliation Drizzle migration, then remove the pointer and commands. |
| `boot_commit_accepted` | **Kill** | Build identity is image/runtime state, not DDL state. Health uses the boot attestation plus existing build commit. |
| Health-only `schema-probe` as safety gate | **Replace** | Boot verification blocks service; health only reports the already-completed attestation. |
| Applied-count / database-ahead gate | **Kill** | Counts cannot identify holes and block safe additive rolling compatibility. Tail hash + required shape are meaningful evidence. |
| CapRover Method 1 build/webhook | **Out of contract** | Production deploys only the CI-built GHCR image through Method 3. |

## Existing-production compatibility

1. Preserve migrations `0000` through `0035` and their journal entries byte for
   byte. CI will reject edits, deletions, duplicate tags/timestamps, non-contiguous
   indexes, or any SQL file/journal-entry mismatch before merge.
2. Append one idempotent reconciliation migration. It reapplies the effects of
   the historically skipped `0027`-`0029` migrations, performs the current
   `0001_site_admin_backfill`, and removes `platform_meta` only after code no
   longer reads it. Existing rows are preserved; already-correct objects are
   no-ops.
3. Do not fabricate missing historical journal rows. The reconciliation
   migration honestly records the repair; its tail hash plus shape verification
   becomes the new trustworthy baseline.
4. Fresh databases apply `0000` through the reconciliation migration normally.
   Existing databases apply only migrations newer than their recorded tail,
   then converge through the same verifier.
5. The first rollout is a forward-only boundary. Roll back by deploying a newer
   corrective image or restoring a tested database backup, not by rewriting the
   journal. Existing old replicas may drain because the reconciliation is
   additive except for the health-only metadata table.

## Required gates

- Unit: journal/file bijection and append-only history; journal discovery for
  no table, `drizzle`, legacy `public`, and ambiguous duplicates; verifier
  failures including the `search_path` trap.
- Container: fresh volume reaches the server and has all four `0027` task
  columns; deliberately remove a required column and prove the container never
  serves; second boot is a no-op; two concurrent boots serialize successfully.
- Upgrade fixture: reproduce the live 33/36 history with missing `0027`-`0029`
  shape, then prove reconciliation preserves data and satisfies the contract.
- Deployment: CI publishes and digest-verifies GHCR; CapRover Method 3 pulls that
  image. Method 1/on-droplet builds remain unsupported.

## Consequences

There is one mental model: migrations change state, generated shape verifies
state, and only verified state serves. This removes semantic version theater and
makes missing DDL a startup failure. The cost is stricter migration discipline:
destructive changes require staged releases, and genuinely large backfills need
a separately designed online job rather than being hidden in container boot.
