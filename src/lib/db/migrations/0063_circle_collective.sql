-- Optional collective grouping for invited union-scoped committees.
-- Circle membership remains the only content-access relationship.
ALTER TABLE "portal_circles" ADD COLUMN "division_id" text;
--> statement-breakpoint
ALTER TABLE "portal_circles" ADD CONSTRAINT "portal_circles_division_id_divisions_id_fk"
  FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_circle_create_allowed(target_union text, target_local text, target_division text, target_visibility text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target_union = nullif(current_setting('app.current_union_id', true), '')
    AND (target_division IS NULL OR EXISTS (
      SELECT 1 FROM divisions d WHERE d.id = target_division AND d.union_id = target_union AND d.archived_at IS NULL
    ))
    AND (target_local IS NULL OR target_division IS NULL OR EXISTS (
      SELECT 1 FROM locals l WHERE l.id = target_local AND l.union_id = target_union AND l.division_id = target_division
    ))
    AND (
      (target_local IS NOT NULL AND app_org_manage(target_union, target_local, 'circles.create'))
      OR
      (target_local IS NULL AND target_visibility = 'invited' AND EXISTS (
        SELECT 1 FROM users u WHERE u.id = nullif(current_setting('app.current_user_id', true), '')
          AND u.union_id = target_union AND u.archived_at IS NULL AND u.locked_at IS NULL
          AND (
            u.roles ?| ARRAY['platform_admin','union_admin']
            OR EXISTS (
              SELECT 1 FROM officer_assignments a JOIN local_memberships m
                ON m.user_id = a.user_id AND m.union_id = a.union_id AND m.local_id = a.local_id
              WHERE a.user_id = u.id AND a.union_id = target_union
                AND a.local_id = nullif(current_setting('app.current_local_id', true), '')
                AND a.position IN ('president','vice_president') AND a.revoked_at IS NULL
                AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
                AND m.status = 'active' AND m.ended_at IS NULL AND m.started_at <= now()
            )
          )
      ))
    )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_circle_create_allowed(text,text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_circle_create_allowed(text,text,text,text) TO unionops_app;
--> statement-breakpoint
DROP POLICY portal_circles_creator_insert ON portal_circles;
--> statement-breakpoint
CREATE POLICY portal_circles_creator_insert ON portal_circles FOR INSERT
WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '')
  AND created_by_id = nullif(current_setting('app.current_user_id', true), '')
  AND app_circle_create_allowed(union_id, local_id, division_id, visibility));
