-- Membership policy + local-number uniqueness + one primary per user/union.
-- Deduplicate existing rows so unique indexes can apply on hosts with legacy drift.

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "membership_policy" text NOT NULL DEFAULT 'multi_local';
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unions_membership_policy_check'
  ) THEN
    ALTER TABLE "unions"
      ADD CONSTRAINT "unions_membership_policy_check"
      CHECK ("membership_policy" IN ('multi_local', 'single_local'));
  END IF;
END $$;
--> statement-breakpoint
-- Rename duplicate active local numbers within a union (keep lowest id).
WITH ranked AS (
  SELECT
    id,
    union_id,
    local_number,
    row_number() OVER (
      PARTITION BY union_id, local_number
      ORDER BY id
    ) AS ordinal
  FROM locals
  WHERE archived_at IS NULL
),
dupes AS (
  SELECT id, local_number
  FROM ranked
  WHERE ordinal > 1
)
UPDATE locals l
SET local_number = d.local_number || '-dup-' || substr(d.id, 1, 8)
FROM dupes d
WHERE l.id = d.id;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "locals_union_number_active_uidx"
  ON "locals" ("union_id", "local_number")
  WHERE "archived_at" IS NULL;
--> statement-breakpoint
-- Collapse multiple active primaries: prefer users.local_id match, else earliest started_at.
WITH ranked AS (
  SELECT
    m.id,
    m.union_id,
    m.user_id,
    row_number() OVER (
      PARTITION BY m.union_id, m.user_id
      ORDER BY
        CASE
          WHEN u.local_id IS NOT NULL AND u.local_id = m.local_id THEN 0
          ELSE 1
        END,
        m.started_at ASC,
        m.id ASC
    ) AS ordinal
  FROM local_memberships m
  LEFT JOIN users u ON u.id = m.user_id
  WHERE m.is_primary = true
    AND m.status = 'active'
    AND m.ended_at IS NULL
)
UPDATE local_memberships m
SET is_primary = false
FROM ranked r
WHERE m.id = r.id AND r.ordinal > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "local_memberships_primary_active_uidx"
  ON "local_memberships" ("union_id", "user_id")
  WHERE "is_primary" = true AND "status" = 'active' AND "ended_at" IS NULL;
