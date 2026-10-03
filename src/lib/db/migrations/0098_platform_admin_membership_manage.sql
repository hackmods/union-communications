-- Site Admin assign-local is cross-tenant. app_org_manage / portal membership
-- sync+revoke previously required the actor's users.union_id to equal the
-- target union, so a platform_admin home-tenanted on another union (demo B7P,
-- host operators) could not INSERT local_memberships or call
-- app_sync_local_portal_membership for OPSEU (etc.).
--
-- Honor MFA-verified app.current_platform_admin for membership manage / portal
-- sync authority without requiring a matching home union. Scope GUCs must still
-- bind to the target union (and local or cross_local).

CREATE OR REPLACE FUNCTION app_org_manage(target_union text, target_local text, capability text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    target_union IS NOT DISTINCT FROM nullif(current_setting('app.current_union_id', true), '')
    AND (
      target_local IS NOT DISTINCT FROM nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
    )
    AND (
      (
        current_setting('app.current_platform_admin', true) = 'true'
        AND current_setting('app.current_mfa_verified', true) = 'true'
        AND capability IN ('memberships.manage', 'officers.manage', 'circles.create')
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = nullif(current_setting('app.current_user_id', true), '')
            AND u.archived_at IS NULL
            AND u.locked_at IS NULL
            AND u.roles ? 'platform_admin'
        )
      )
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = nullif(current_setting('app.current_user_id', true), '')
          AND u.union_id = target_union
          AND u.archived_at IS NULL
          AND u.locked_at IS NULL
          AND (
            (
              capability IN ('memberships.manage', 'officers.manage', 'circles.create')
              AND u.roles ?| ARRAY['platform_admin', 'union_admin', 'division_admin']
            )
            OR EXISTS (
              SELECT 1 FROM officer_assignments a
              JOIN local_memberships m
                ON m.user_id = a.user_id
               AND m.union_id = a.union_id
               AND m.local_id = a.local_id
              WHERE a.user_id = u.id
                AND a.union_id = target_union
                AND a.local_id = target_local
                AND a.position IN ('president', 'vice_president')
                AND a.revoked_at IS NULL
                AND a.starts_at <= now()
                AND (a.ends_at IS NULL OR a.ends_at > now())
                AND m.status = 'active'
                AND m.ended_at IS NULL
                AND m.started_at <= now()
            )
          )
      )
    )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_org_manage(text, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_org_manage(text, text, text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_sync_local_portal_membership(target_union text, target_local text, target_user text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_id text := nullif(current_setting('app.current_user_id', true), '');
  local_number text;
  member_name text;
  portal_circle_id text;
  is_officer_admin boolean;
  host_platform_admin boolean :=
    current_setting('app.current_platform_admin', true) = 'true'
    AND current_setting('app.current_mfa_verified', true) = 'true'
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = caller_id
        AND u.archived_at IS NULL
        AND u.locked_at IS NULL
        AND u.roles ? 'platform_admin'
    );
BEGIN
  IF target_union IS DISTINCT FROM nullif(current_setting('app.current_union_id', true), '')
     OR (
       target_local IS DISTINCT FROM nullif(current_setting('app.current_local_id', true), '')
       AND current_setting('app.current_cross_local', true) <> 'true'
     ) THEN
    RAISE EXCEPTION 'membership scope denied'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM local_memberships m
    JOIN users u ON u.id = m.user_id
    WHERE m.union_id = target_union
      AND m.local_id = target_local
      AND m.user_id = target_user
      AND m.status = 'active'
      AND m.ended_at IS NULL
      AND m.started_at <= now()
      AND u.union_id = target_union
      AND u.archived_at IS NULL
      AND u.locked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'active local membership required'
      USING ERRCODE = 'P0001';
  END IF;

  IF caller_id IS DISTINCT FROM target_user AND NOT (
    host_platform_admin
    OR EXISTS (
      SELECT 1 FROM officer_assignments a
      JOIN local_memberships m
        ON m.user_id = a.user_id
       AND m.union_id = a.union_id
       AND m.local_id = a.local_id
      WHERE a.user_id = caller_id
        AND a.union_id = target_union
        AND a.local_id = target_local
        AND a.position IN ('president', 'vice_president')
        AND a.revoked_at IS NULL
        AND a.starts_at <= now()
        AND (a.ends_at IS NULL OR a.ends_at > now())
        AND m.status = 'active'
        AND m.ended_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = caller_id
        AND u.union_id = target_union
        AND u.roles ?| ARRAY['platform_admin', 'union_admin', 'division_admin']
    )
  ) THEN
    RAISE EXCEPTION 'membership management authority required'
      USING ERRCODE = '42501';
  END IF;

  SELECT l.local_number INTO local_number
  FROM locals l
  WHERE l.id = target_local AND l.union_id = target_union;

  SELECT u.name INTO member_name
  FROM users u
  WHERE u.id = target_user AND u.union_id = target_union;

  SELECT c.id INTO portal_circle_id
  FROM portal_circles c
  WHERE c.union_id = target_union
    AND c.local_id = target_local
    AND c.kind = 'local_hall'
    AND c.archived_at IS NULL
  ORDER BY c.created_at
  LIMIT 1;

  portal_circle_id := COALESCE(portal_circle_id, 'circle-hall-' || target_local);

  SELECT EXISTS (
    SELECT 1 FROM officer_assignments a
    JOIN local_memberships m
      ON m.user_id = a.user_id
     AND m.union_id = a.union_id
     AND m.local_id = a.local_id
    WHERE a.user_id = target_user
      AND a.union_id = target_union
      AND a.local_id = target_local
      AND a.position IN ('president', 'vice_president')
      AND a.revoked_at IS NULL
      AND a.starts_at <= now()
      AND (a.ends_at IS NULL OR a.ends_at > now())
      AND m.status = 'active'
      AND m.ended_at IS NULL
  ) INTO is_officer_admin;

  INSERT INTO portal_circles (
    id, union_id, local_id, kind, name, description, visibility, created_by_id, created_at, updated_at
  )
  VALUES (
    portal_circle_id,
    target_union,
    target_local,
    'local_hall',
    CASE
      WHEN local_number IS NULL OR local_number = '' THEN 'Hall'
      ELSE 'Local ' || local_number || ' Hall'
    END,
    'Default Hall for members and officers of this local.',
    'local_members',
    'system',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO portal_circle_memberships (
    id, circle_id, user_id, user_name, role, muted, muted_tools, starred, joined_at
  )
  VALUES (
    'cm-' || md5(portal_circle_id || ':' || target_user),
    portal_circle_id,
    target_user,
    COALESCE(member_name, 'Member'),
    CASE WHEN is_officer_admin THEN 'admin' ELSE 'member' END,
    false,
    '[]'::jsonb,
    true,
    now()
  )
  ON CONFLICT (circle_id, user_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    role = EXCLUDED.role;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_sync_local_portal_membership(text, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_sync_local_portal_membership(text, text, text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_revoke_local_portal_membership(target_union text, target_local text, target_user text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_id text := nullif(current_setting('app.current_user_id', true), '');
  host_platform_admin boolean :=
    current_setting('app.current_platform_admin', true) = 'true'
    AND current_setting('app.current_mfa_verified', true) = 'true'
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = caller_id
        AND u.archived_at IS NULL
        AND u.locked_at IS NULL
        AND u.roles ? 'platform_admin'
    );
BEGIN
  IF target_union IS DISTINCT FROM nullif(current_setting('app.current_union_id', true), '')
     OR (
       target_local IS DISTINCT FROM nullif(current_setting('app.current_local_id', true), '')
       AND current_setting('app.current_cross_local', true) <> 'true'
     ) THEN
    RAISE EXCEPTION 'membership scope denied'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (
    host_platform_admin
    OR EXISTS (
      SELECT 1 FROM officer_assignments a
      JOIN local_memberships m
        ON m.user_id = a.user_id
       AND m.local_id = a.local_id
       AND m.union_id = a.union_id
      WHERE a.user_id = caller_id
        AND a.union_id = target_union
        AND a.local_id = target_local
        AND a.position IN ('president', 'vice_president')
        AND a.revoked_at IS NULL
        AND a.starts_at <= now()
        AND (a.ends_at IS NULL OR a.ends_at > now())
        AND m.status = 'active'
        AND m.ended_at IS NULL
        AND m.started_at <= now()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = caller_id
        AND u.union_id = target_union
        AND u.roles ?| ARRAY['platform_admin', 'union_admin', 'division_admin']
    )
  ) THEN
    RAISE EXCEPTION 'membership authority denied'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM portal_circle_memberships cm
  USING portal_circles c
  WHERE cm.circle_id = c.id
    AND c.union_id = target_union
    AND c.local_id = target_local
    AND cm.user_id = target_user;

  UPDATE officer_assignments
  SET revoked_at = now()
  WHERE union_id = target_union
    AND local_id = target_local
    AND user_id = target_user
    AND revoked_at IS NULL;

  UPDATE authority_delegations
  SET revoked_at = now(), revoked_by_id = caller_id
  WHERE union_id = target_union
    AND local_id = target_local
    AND revoked_at IS NULL
    AND (delegate_user_id = target_user OR grantor_user_id = target_user);

  UPDATE break_glass_grants
  SET revoked_at = now()
  WHERE union_id = target_union
    AND local_id = target_local
    AND user_id = target_user
    AND revoked_at IS NULL;

  UPDATE users SET
    accessible_local_ids = COALESCE(accessible_local_ids, '[]'::jsonb) - target_local,
    local_id = CASE
      WHEN local_id = target_local THEN (
        SELECT local_id
        FROM local_memberships lm
        WHERE lm.user_id = target_user
          AND lm.union_id = target_union
          AND lm.status = 'active'
          AND lm.ended_at IS NULL
          AND lm.is_primary
        ORDER BY lm.started_at DESC
        LIMIT 1
      )
      ELSE local_id
    END,
    bargaining_unit_id = CASE
      WHEN local_id = target_local THEN NULL
      ELSE bargaining_unit_id
    END,
    session_version = session_version + 1
  WHERE id = target_user
    AND union_id = target_union;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_revoke_local_portal_membership(text, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_revoke_local_portal_membership(text, text, text) TO unionops_app;
