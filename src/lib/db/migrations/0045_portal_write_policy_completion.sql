-- Complete member preference writes without allowing members to grant Circle roles.
CREATE OR REPLACE FUNCTION app_guard_portal_circle_membership_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_id text := nullif(current_setting('app.current_user_id', true), '');
BEGIN
  IF OLD.user_id = actor_id AND NOT app_portal_circle_admin(OLD.circle_id, actor_id) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.circle_id IS DISTINCT FROM OLD.circle_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.user_name IS DISTINCT FROM OLD.user_name
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.joined_at IS DISTINCT FROM OLD.joined_at THEN
      RAISE EXCEPTION 'members may only update Circle preferences';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_guard_portal_circle_membership_update() FROM PUBLIC;
--> statement-breakpoint
DROP TRIGGER IF EXISTS portal_circle_membership_update_guard ON portal_circle_memberships;
--> statement-breakpoint
CREATE TRIGGER portal_circle_membership_update_guard
BEFORE UPDATE ON portal_circle_memberships
FOR EACH ROW EXECUTE FUNCTION app_guard_portal_circle_membership_update();
--> statement-breakpoint
ALTER TABLE portal_circle_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS portal_circle_memberships_self_preferences_update ON portal_circle_memberships;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_self_preferences_update ON portal_circle_memberships FOR UPDATE
USING (EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), ''))
  AND (user_id = nullif(current_setting('app.current_user_id', true), '') OR app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), ''))))
WITH CHECK (EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), ''))
  AND (user_id = nullif(current_setting('app.current_user_id', true), '') OR app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), ''))));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_create_portal_dispatch(
  target_circle text,
  target_user text,
  item_kind text,
  item_title text,
  item_body text DEFAULT NULL
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_id text := nullif(current_setting('app.current_user_id', true), '');
DECLARE circle_row portal_circles%ROWTYPE;
DECLARE new_id text := 'di-' || gen_random_uuid()::text;
BEGIN
  SELECT * INTO circle_row FROM portal_circles WHERE id = target_circle;
  IF circle_row.id IS NULL
    OR circle_row.union_id IS DISTINCT FROM nullif(current_setting('app.current_union_id', true), '')
    OR NOT app_portal_circle_writer(target_circle, actor_id)
    OR NOT EXISTS (SELECT 1 FROM portal_circle_memberships m WHERE m.circle_id = target_circle AND m.user_id = target_user) THEN
    RAISE EXCEPTION 'Circle dispatch scope denied';
  END IF;
  IF item_kind NOT IN ('mention','assignment','due_soon','bulletin','roll_call','pipeline')
    OR length(trim(item_title)) = 0 OR length(item_title) > 500
    OR (item_body IS NOT NULL AND length(item_body) > 2000) THEN
    RAISE EXCEPTION 'invalid dispatch item';
  END IF;
  INSERT INTO portal_dispatch_items (id, union_id, user_id, circle_id, circle_name, kind, title, body, created_at)
  VALUES (new_id, circle_row.union_id, target_user, circle_row.id, circle_row.name, item_kind, trim(item_title), item_body, now());
  RETURN new_id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_create_portal_dispatch(text,text,text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_create_portal_dispatch(text,text,text,text,text) TO unionops_app;
--> statement-breakpoint
ALTER TABLE portal_sidebar_messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS portal_sidebar_messages_participant ON portal_sidebar_messages;
--> statement-breakpoint
CREATE POLICY portal_sidebar_messages_participant_read ON portal_sidebar_messages FOR SELECT
USING (union_id = nullif(current_setting('app.current_union_id', true), '')
  AND app_portal_sidebar_participant(thread_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_sidebar_messages_participant_insert ON portal_sidebar_messages FOR INSERT
WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '')
  AND author_id = nullif(current_setting('app.current_user_id', true), '')
  AND app_portal_sidebar_participant(thread_id, nullif(current_setting('app.current_user_id', true), '')));
