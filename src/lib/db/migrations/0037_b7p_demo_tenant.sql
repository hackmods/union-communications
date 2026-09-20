-- B7P demo tenant registry + keep legacy OPSEU demo ids purgeable.
-- Idempotent: only flips is_demo false → true.

UPDATE "unions"
SET "is_demo" = true
WHERE "is_demo" = false AND "id" IN ('union-b7p', 'union-opseu');--> statement-breakpoint

UPDATE "users"
SET "is_demo" = true
WHERE "is_demo" = false AND "email" LIKE '%unionops.test%';--> statement-breakpoint

UPDATE "locals"
SET "is_demo" = true
WHERE "is_demo" = false
  AND "union_id" IN (SELECT "id" FROM "unions" WHERE "is_demo" = true);--> statement-breakpoint

UPDATE "divisions"
SET "is_demo" = true
WHERE "is_demo" = false
  AND "union_id" IN (SELECT "id" FROM "unions" WHERE "is_demo" = true);
