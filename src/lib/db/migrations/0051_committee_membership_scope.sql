-- Bind normalized committee members to a same-scope committee and active local member.
CREATE UNIQUE INDEX IF NOT EXISTS "committees_scope_fk_uidx"
  ON "committees" ("id", "union_id", "local_id");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'committee_memberships_committee_scope_fk'
      AND conrelid = 'committee_memberships'::regclass
  ) THEN
    ALTER TABLE "committee_memberships"
      ADD CONSTRAINT "committee_memberships_committee_scope_fk"
      FOREIGN KEY ("committee_id", "union_id", "local_id")
      REFERENCES "committees" ("id", "union_id", "local_id")
      ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
DROP POLICY IF EXISTS committee_memberships_manage_insert ON committee_memberships;
--> statement-breakpoint
CREATE POLICY committee_memberships_manage_insert ON committee_memberships FOR INSERT
WITH CHECK (
  app_org_manage(union_id, local_id, 'officers.manage')
  AND EXISTS (
    SELECT 1 FROM local_memberships lm
    JOIN users u ON u.id = lm.user_id
    WHERE lm.user_id = committee_memberships.user_id
      AND lm.union_id = committee_memberships.union_id
      AND lm.local_id = committee_memberships.local_id
      AND lm.status = 'active'
      AND lm.ended_at IS NULL
      AND lm.started_at <= now()
      AND u.archived_at IS NULL
      AND u.locked_at IS NULL
      AND u.union_id = committee_memberships.union_id
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS committee_memberships_manage_update ON committee_memberships;
--> statement-breakpoint
CREATE POLICY committee_memberships_manage_update ON committee_memberships FOR UPDATE
USING (app_org_manage(union_id, local_id, 'officers.manage'))
WITH CHECK (
  app_org_manage(union_id, local_id, 'officers.manage')
  AND EXISTS (
    SELECT 1 FROM local_memberships lm
    JOIN users u ON u.id = lm.user_id
    WHERE lm.user_id = committee_memberships.user_id
      AND lm.union_id = committee_memberships.union_id
      AND lm.local_id = committee_memberships.local_id
      AND lm.status = 'active'
      AND lm.ended_at IS NULL
      AND lm.started_at <= now()
      AND u.archived_at IS NULL
      AND u.locked_at IS NULL
      AND u.union_id = committee_memberships.union_id
  )
);
