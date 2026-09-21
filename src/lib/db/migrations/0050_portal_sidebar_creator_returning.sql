-- New Sidebar threads are returned before their participant rows are inserted.
-- Keep all reads union-scoped and allow only the creator to read that initial
-- returned row; later reads still require direct participation.
DROP POLICY IF EXISTS portal_sidebar_participant ON portal_sidebar_threads;
--> statement-breakpoint
CREATE POLICY portal_sidebar_participant ON portal_sidebar_threads FOR ALL
USING (
  union_id = nullif(current_setting('app.current_union_id', true), '')
  AND (
    app_portal_sidebar_participant(id, nullif(current_setting('app.current_user_id', true), ''))
    OR created_by_id = nullif(current_setting('app.current_user_id', true), '')
  )
)
WITH CHECK (
  union_id = nullif(current_setting('app.current_union_id', true), '')
  AND (
    created_by_id = nullif(current_setting('app.current_user_id', true), '')
    OR app_portal_sidebar_participant(id, nullif(current_setting('app.current_user_id', true), ''))
  )
);
