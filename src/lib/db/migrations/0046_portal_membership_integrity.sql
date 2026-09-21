-- Bind explicit Portal participants to active accounts in the current union.
CREATE OR REPLACE FUNCTION app_portal_active_union_user(target_user text, target_union text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = target_user AND u.union_id = target_union
      AND u.archived_at IS NULL AND u.locked_at IS NULL
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_portal_active_union_user(text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_portal_active_union_user(text,text) TO unionops_app;
--> statement-breakpoint
DROP POLICY IF EXISTS portal_circle_memberships_creator_insert ON portal_circle_memberships;
--> statement-breakpoint
ALTER TABLE portal_circle_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_creator_insert ON portal_circle_memberships FOR INSERT
WITH CHECK (
  app_portal_active_union_user(user_id, nullif(current_setting('app.current_union_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), ''))
  AND (app_portal_circle_creator(circle_id, nullif(current_setting('app.current_user_id', true), ''))
    OR app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), '')))
);
--> statement-breakpoint
DROP POLICY IF EXISTS portal_sidebar_participants_creator_insert ON portal_sidebar_participants;
--> statement-breakpoint
ALTER TABLE portal_sidebar_participants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_sidebar_participants_creator_insert ON portal_sidebar_participants FOR INSERT
WITH CHECK (
  app_portal_sidebar_creator(thread_id, nullif(current_setting('app.current_user_id', true), ''))
  AND app_portal_active_union_user(user_id, nullif(current_setting('app.current_union_id', true), ''))
);
--> statement-breakpoint
ALTER TABLE portal_sidebar_threads ADD COLUMN IF NOT EXISTS participant_pair_key text;
--> statement-breakpoint
UPDATE portal_sidebar_threads t
SET participant_pair_key = COALESCE((
  SELECT string_agg(p.user_id, chr(31) ORDER BY p.user_id)
  FROM portal_sidebar_participants p
  WHERE p.thread_id = t.id
  HAVING count(*) = 2
), 'legacy:' || t.id)
WHERE participant_pair_key IS NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM portal_sidebar_threads
    WHERE participant_pair_key IS NULL
  ) THEN
    RAISE EXCEPTION 'Unable to backfill Portal Sidebar participant pair keys';
  END IF;
END $$;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, union_id, participant_pair_key,
    first_value(id) OVER (PARTITION BY union_id, participant_pair_key ORDER BY updated_at, id) AS canonical_id,
    row_number() OVER (PARTITION BY union_id, participant_pair_key ORDER BY updated_at, id) AS ordinal
  FROM portal_sidebar_threads
  WHERE participant_pair_key NOT LIKE 'legacy:%'
), duplicates AS (
  SELECT id, union_id, participant_pair_key, canonical_id
  FROM ranked WHERE ordinal > 1
)
UPDATE portal_sidebar_messages m
SET thread_id = d.canonical_id
FROM duplicates d
WHERE m.thread_id = d.id;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, union_id, participant_pair_key,
    first_value(id) OVER (PARTITION BY union_id, participant_pair_key ORDER BY updated_at, id) AS canonical_id,
    row_number() OVER (PARTITION BY union_id, participant_pair_key ORDER BY updated_at, id) AS ordinal
  FROM portal_sidebar_threads
  WHERE participant_pair_key NOT LIKE 'legacy:%'
), duplicates AS (
  SELECT id, canonical_id FROM ranked WHERE ordinal > 1
)
DELETE FROM portal_sidebar_participants p USING duplicates d WHERE p.thread_id = d.id;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, union_id, participant_pair_key,
    first_value(id) OVER (PARTITION BY union_id, participant_pair_key ORDER BY updated_at, id) AS canonical_id,
    row_number() OVER (PARTITION BY union_id, participant_pair_key ORDER BY updated_at, id) AS ordinal
  FROM portal_sidebar_threads
  WHERE participant_pair_key NOT LIKE 'legacy:%'
), duplicates AS (
  SELECT id, canonical_id FROM ranked WHERE ordinal > 1
)
UPDATE portal_sidebar_threads canonical
SET updated_at = greatest(canonical.updated_at, duplicate.updated_at)
FROM duplicates d
JOIN portal_sidebar_threads duplicate ON duplicate.id = d.id
WHERE canonical.id = d.canonical_id;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, union_id, participant_pair_key,
    row_number() OVER (PARTITION BY union_id, participant_pair_key ORDER BY updated_at, id) AS ordinal
  FROM portal_sidebar_threads
  WHERE participant_pair_key NOT LIKE 'legacy:%'
), duplicates AS (SELECT id FROM ranked WHERE ordinal > 1)
DELETE FROM portal_sidebar_threads t USING duplicates d WHERE t.id = d.id;
--> statement-breakpoint
ALTER TABLE portal_sidebar_threads ALTER COLUMN participant_pair_key SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS portal_sidebar_threads_pair_uidx
ON portal_sidebar_threads (union_id, participant_pair_key);
