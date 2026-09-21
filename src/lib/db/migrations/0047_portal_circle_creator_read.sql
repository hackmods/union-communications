-- Circle creation uses INSERT ... RETURNING before the creator membership row
-- exists. Let the same-union creator read that new Circle during the setup
-- transaction; all other reads still require explicit Circle membership.
DROP POLICY IF EXISTS portal_circles_member_scope ON portal_circles;
--> statement-breakpoint
CREATE POLICY portal_circles_member_scope ON portal_circles FOR SELECT
USING (
  union_id = nullif(current_setting('app.current_union_id', true), '')
  AND (
    app_portal_circle_member(id, nullif(current_setting('app.current_user_id', true), ''))
    OR app_portal_circle_creator(id, nullif(current_setting('app.current_user_id', true), ''))
  )
);
