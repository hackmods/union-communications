# Data migrations (`platform_meta.data_version`)

Versioned, resumable **data** upgrades — the EF `HasData()` analog for UnionOps.
Distinct from DDL schema migrations (`src/lib/db/migrations/*.sql`, tracked by
Drizzle's `__drizzle_migrations` journal).

## Contract

1. **Naming:** `NNNN_description.sql` — zero-padded numeric version prefix, descriptive suffix.
   Files that don't match `NNNN_*.sql` are ignored (with a warning).
2. **Ordering:** applied in ascending numeric `NNNN` order; duplicate versions are rejected.
3. **Pointer:** `platform_meta.data_version` records the last applied data migration
   (`0` = none). Only migrations with `version > data_version` run.
4. **Transactional:** each file runs inside its own transaction. `data_version` advances
   only when the file succeeds → a later failure rolls back that file and the next boot
   resumes where it stopped (never re-applies completed steps).
5. **Idempotence:** files run exactly once (version pointer), but write them defensively
   (`WHERE NOT EXISTS`, `ON CONFLICT DO NOTHING`) as a belt-and-suspenders measure.
6. **Role:** executed with the owner/migrate URL (`MIGRATE_DATABASE_URL`) — same RLS-bypass
   rationale as `db:seed`. Never write secrets; prefer env/ops for config.

## Running

- Container boot (`docker/entrypoint.sh` → `node db-maintain.mjs maintain`) — automatic.
- Local full pipeline: `npm run db:maintain`
- Data only: `npm run db:data-migrate`
- Baseline only (ensure `platform_meta` exists): `npm run db:baseline`

## Example

```sql
-- 0001_backfill_union_ids.sql
UPDATE grievances SET union_id = 'union-ref'
WHERE union_id IS NULL;
```

## Rollback

Forward-only by design — a corrective data migration (`0002_...`) reverts a bad 0001
transform, never a `DOWN` file.