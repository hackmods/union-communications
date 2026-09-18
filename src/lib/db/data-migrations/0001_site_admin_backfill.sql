-- Site Admin backfill (2026-09-17, data-migration 0001).
--
-- FLAGS demo-shaped rows for the new `is_demo` registry so the
-- `/app/site-admin/demo-cleanup` preview can find them by a single column
-- lookup instead of fragile regexes on `email`.
--
-- Idempotent: every UPDATE is guarded with `is_demo = false` so re-runs
-- are no-ops. Rows that acquire `is_demo = true` later (e.g., a fresh
-- demo seed insert) should set the column directly — not via this file.
--
-- References:
--   * Seeded reference tenant union id: `union-opseu`
--     (`seed/reference-tenant-opseu-caat.json`).
--   * Demo roster email convention: `unionops.test`
--     (`src/lib/auth/demo-users.ts` + `src/lib/auth/demo-login-accounts.ts`).

UPDATE "users"
SET "is_demo" = true
WHERE "is_demo" = false
  AND "email" LIKE '%unionops.test%';
--> statement-breakpoint
UPDATE "unions"
SET "is_demo" = true
WHERE "is_demo" = false
  AND "id" IN ('union-opseu');
--> statement-breakpoint
UPDATE "locals"
SET "is_demo" = true
WHERE "is_demo" = false
  AND "union_id" IN (SELECT "id" FROM "unions" WHERE "is_demo" = true);
--> statement-breakpoint
UPDATE "divisions"
SET "is_demo" = true
WHERE "is_demo" = false
  AND "union_id" IN (SELECT "id" FROM "unions" WHERE "is_demo" = true);
