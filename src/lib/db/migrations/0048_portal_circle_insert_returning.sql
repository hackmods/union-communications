-- INSERT ... RETURNING cannot consult the just-inserted row through a helper
-- SELECT in the same command. Bind creator access directly to the returned
-- row while retaining the union and existing membership restrictions.
DROP POLICY IF EXISTS portal_circles_member_scope ON portal_circles;
--> statement-breakpoint
CREATE POLICY portal_circles_member_scope ON portal_circles FOR SELECT
USING (
  union_id = nullif(current_setting('app.current_union_id', true), '')
  AND (
    app_portal_circle_member(id, nullif(current_setting('app.current_user_id', true), ''))
    OR created_by_id = nullif(current_setting('app.current_user_id', true), '')
  )
);
