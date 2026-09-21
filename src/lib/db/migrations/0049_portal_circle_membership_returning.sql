-- The creator inserts their initial roster row immediately after creating a
-- Circle. Allow only that same-union user to read their own returned bootstrap
-- membership before the explicit membership relationship exists.
DROP POLICY IF EXISTS portal_circle_memberships_member_scope ON portal_circle_memberships;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_member_scope ON portal_circle_memberships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portal_circles c
    WHERE c.id = circle_id
      AND c.union_id = nullif(current_setting('app.current_union_id', true), '')
  )
  AND (
    app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), ''))
    OR (
      user_id = nullif(current_setting('app.current_user_id', true), '')
      AND app_portal_circle_creator(circle_id, nullif(current_setting('app.current_user_id', true), ''))
    )
  )
);
