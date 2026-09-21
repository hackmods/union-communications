-- Archived Circles are no longer an active membership relationship. Keep the
-- Circle row visible to its Circle admins for the archive UPDATE ... RETURNING
-- path, but revoke member and child-resource access immediately.
CREATE OR REPLACE FUNCTION app_portal_circle_member(target_circle text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM portal_circle_memberships m
    JOIN portal_circles c ON c.id = m.circle_id
    WHERE m.circle_id = target_circle AND m.user_id = target_user AND c.archived_at IS NULL
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_portal_circle_writer(target_circle text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM portal_circle_memberships m
    JOIN portal_circles c ON c.id = m.circle_id
    WHERE m.circle_id = target_circle AND m.user_id = target_user
      AND m.role IN ('member','admin') AND c.archived_at IS NULL
  )
$$;
--> statement-breakpoint
DROP POLICY IF EXISTS portal_circles_member_scope ON portal_circles;
--> statement-breakpoint
CREATE POLICY portal_circles_member_scope ON portal_circles FOR SELECT
USING (
  union_id = nullif(current_setting('app.current_union_id', true), '')
  AND (
    (
      archived_at IS NULL
      AND (
        app_portal_circle_member(id, nullif(current_setting('app.current_user_id', true), ''))
        OR created_by_id = nullif(current_setting('app.current_user_id', true), '')
      )
    )
    OR (
      archived_at IS NOT NULL
      AND app_portal_circle_admin(id, nullif(current_setting('app.current_user_id', true), ''))
    )
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS portal_circle_memberships_member_scope ON portal_circle_memberships;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_member_scope ON portal_circle_memberships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portal_circles c
    WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')
      AND c.archived_at IS NULL
  )
  AND (
    app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), ''))
    OR (
      user_id = nullif(current_setting('app.current_user_id', true), '')
      AND app_portal_circle_creator(circle_id, nullif(current_setting('app.current_user_id', true), ''))
    )
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS portal_circle_memberships_creator_insert ON portal_circle_memberships;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_creator_insert ON portal_circle_memberships FOR INSERT
WITH CHECK (
  app_portal_active_union_user(user_id, nullif(current_setting('app.current_union_id', true), ''))
  AND EXISTS (
    SELECT 1 FROM portal_circles c
    WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')
      AND c.archived_at IS NULL
  )
  AND (
    app_portal_circle_creator(circle_id, nullif(current_setting('app.current_user_id', true), ''))
    OR app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS portal_circle_memberships_self_preferences_update ON portal_circle_memberships;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_self_preferences_update ON portal_circle_memberships FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM portal_circles c
    WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')
      AND c.archived_at IS NULL
  )
  AND (
    user_id = nullif(current_setting('app.current_user_id', true), '')
    OR app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portal_circles c
    WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')
      AND c.archived_at IS NULL
  )
  AND (
    user_id = nullif(current_setting('app.current_user_id', true), '')
    OR app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  )
);
--> statement-breakpoint
DROP POLICY IF EXISTS portal_circle_memberships_admin_update ON portal_circle_memberships;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_admin_update ON portal_circle_memberships FOR UPDATE
USING (
  app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.archived_at IS NULL)
)
WITH CHECK (
  app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.archived_at IS NULL)
);
--> statement-breakpoint
DROP POLICY IF EXISTS portal_circle_memberships_admin_delete ON portal_circle_memberships;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_admin_delete ON portal_circle_memberships FOR DELETE
USING (
  app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.archived_at IS NULL)
);
