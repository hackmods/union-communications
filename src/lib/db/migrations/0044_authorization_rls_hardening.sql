-- A missing local is no longer an implicit all-locals grant.
CREATE OR REPLACE FUNCTION app_portal_circle_member(target_circle text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM portal_circle_memberships m WHERE m.circle_id = target_circle AND m.user_id = target_user)
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_portal_circle_admin(target_circle text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM portal_circle_memberships m JOIN portal_circles c ON c.id = m.circle_id
    WHERE m.circle_id = target_circle AND m.user_id = target_user AND m.role = 'admin'
      AND (c.kind <> 'local_hall' OR EXISTS (
        SELECT 1 FROM officer_assignments a JOIN local_memberships lm
          ON lm.user_id = a.user_id AND lm.union_id = a.union_id AND lm.local_id = a.local_id
        WHERE a.user_id = target_user AND a.union_id = c.union_id AND a.local_id = c.local_id
          AND a.position IN ('president','vice_president') AND a.revoked_at IS NULL
          AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
          AND lm.status = 'active' AND lm.ended_at IS NULL
      ))
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_portal_circle_writer(target_circle text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM portal_circle_memberships m WHERE m.circle_id = target_circle AND m.user_id = target_user AND m.role IN ('member','admin'))
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_portal_sidebar_participant(target_thread text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM portal_sidebar_participants p WHERE p.thread_id = target_thread AND p.user_id = target_user)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_portal_circle_member(text,text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_portal_circle_admin(text,text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_portal_circle_writer(text,text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_portal_sidebar_participant(text,text) FROM PUBLIC;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_portal_circle_creator(target_circle text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = target_circle AND c.created_by_id = target_user)
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_portal_sidebar_creator(target_thread text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM portal_sidebar_threads t WHERE t.id = target_thread AND t.created_by_id = target_user)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_portal_circle_creator(text,text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_portal_sidebar_creator(text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_portal_circle_member(text,text) TO unionops_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_portal_circle_admin(text,text) TO unionops_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_portal_circle_writer(text,text) TO unionops_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_portal_sidebar_participant(text,text) TO unionops_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_portal_circle_creator(text,text) TO unionops_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_portal_sidebar_creator(text,text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_revoke_local_portal_membership(target_union text, target_local text, target_user text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_id text := nullif(current_setting('app.current_user_id', true), '');
BEGIN
  IF target_union IS DISTINCT FROM nullif(current_setting('app.current_union_id', true), '')
     OR (target_local IS DISTINCT FROM nullif(current_setting('app.current_local_id', true), '') AND current_setting('app.current_cross_local', true) <> 'true') THEN
    RAISE EXCEPTION 'membership scope denied';
  END IF;
  IF NOT (
    EXISTS (
      SELECT 1 FROM officer_assignments a
      JOIN local_memberships m ON m.user_id = a.user_id AND m.local_id = a.local_id AND m.union_id = a.union_id
      WHERE a.user_id = caller_id AND a.union_id = target_union AND a.local_id = target_local
            AND a.position IN ('president','vice_president') AND a.revoked_at IS NULL
            AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
            AND m.status = 'active' AND m.ended_at IS NULL AND m.started_at <= now()
    )
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = caller_id AND u.union_id = target_union
        AND u.roles ?| ARRAY['platform_admin','union_admin','division_admin']
    )
  ) THEN RAISE EXCEPTION 'membership authority denied'; END IF;

  DELETE FROM portal_circle_memberships cm USING portal_circles c
    WHERE cm.circle_id = c.id AND c.union_id = target_union AND c.local_id = target_local AND cm.user_id = target_user;
  UPDATE officer_assignments SET revoked_at = now()
    WHERE union_id = target_union AND local_id = target_local AND user_id = target_user AND revoked_at IS NULL;
  UPDATE authority_delegations SET revoked_at = now(), revoked_by_id = caller_id
    WHERE union_id = target_union AND local_id = target_local AND revoked_at IS NULL
      AND (delegate_user_id = target_user OR grantor_user_id = target_user);
  UPDATE break_glass_grants SET revoked_at = now()
    WHERE union_id = target_union AND local_id = target_local AND user_id = target_user AND revoked_at IS NULL;
  UPDATE users SET
    accessible_local_ids = COALESCE(accessible_local_ids, '[]'::jsonb) - target_local,
    local_id = CASE WHEN local_id = target_local THEN (
      SELECT local_id FROM local_memberships lm WHERE lm.user_id = target_user AND lm.union_id = target_union
        AND lm.status = 'active' AND lm.ended_at IS NULL AND lm.is_primary ORDER BY lm.started_at DESC LIMIT 1
    ) ELSE local_id END,
    bargaining_unit_id = CASE WHEN local_id = target_local THEN NULL ELSE bargaining_unit_id END,
    session_version = session_version + 1
    WHERE id = target_user AND union_id = target_union;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_revoke_local_portal_membership(text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_revoke_local_portal_membership(text,text,text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_sync_local_portal_membership(target_union text, target_local text, target_user text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_id text := nullif(current_setting('app.current_user_id', true), '');
  local_number text;
  member_name text;
  portal_circle_id text;
  is_officer_admin boolean;
BEGIN
  IF target_union IS DISTINCT FROM nullif(current_setting('app.current_union_id', true), '')
     OR (target_local IS DISTINCT FROM nullif(current_setting('app.current_local_id', true), '') AND current_setting('app.current_cross_local', true) <> 'true') THEN
    RAISE EXCEPTION 'membership scope denied';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM local_memberships m JOIN users u ON u.id = m.user_id
    WHERE m.union_id = target_union AND m.local_id = target_local AND m.user_id = target_user
      AND m.status = 'active' AND m.ended_at IS NULL AND m.started_at <= now()
      AND u.union_id = target_union AND u.archived_at IS NULL AND u.locked_at IS NULL
  ) THEN RAISE EXCEPTION 'active local membership required'; END IF;
  IF caller_id IS DISTINCT FROM target_user AND NOT (
    EXISTS (
      SELECT 1 FROM officer_assignments a JOIN local_memberships m
        ON m.user_id = a.user_id AND m.union_id = a.union_id AND m.local_id = a.local_id
      WHERE a.user_id = caller_id AND a.union_id = target_union AND a.local_id = target_local
        AND a.position IN ('president','vice_president') AND a.revoked_at IS NULL
        AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
        AND m.status = 'active' AND m.ended_at IS NULL
    )
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = caller_id AND u.union_id = target_union AND u.roles ?| ARRAY['platform_admin','union_admin','division_admin'])
  ) THEN RAISE EXCEPTION 'membership management authority required'; END IF;

  SELECT l.local_number INTO local_number FROM locals l WHERE l.id = target_local AND l.union_id = target_union;
  SELECT u.name INTO member_name FROM users u WHERE u.id = target_user AND u.union_id = target_union;
  SELECT c.id INTO portal_circle_id FROM portal_circles c WHERE c.union_id = target_union AND c.local_id = target_local
    AND c.kind = 'local_hall' AND c.archived_at IS NULL ORDER BY c.created_at LIMIT 1;
  portal_circle_id := COALESCE(portal_circle_id, 'circle-hall-' || target_local);
  SELECT EXISTS (
    SELECT 1 FROM officer_assignments a JOIN local_memberships m
      ON m.user_id = a.user_id AND m.union_id = a.union_id AND m.local_id = a.local_id
    WHERE a.user_id = target_user AND a.union_id = target_union AND a.local_id = target_local
      AND a.position IN ('president','vice_president') AND a.revoked_at IS NULL
      AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
      AND m.status = 'active' AND m.ended_at IS NULL
  ) INTO is_officer_admin;

  INSERT INTO portal_circles (id, union_id, local_id, kind, name, description, visibility, created_by_id, created_at, updated_at)
  VALUES (portal_circle_id, target_union, target_local, 'local_hall',
    CASE WHEN local_number IS NULL OR local_number = '' THEN 'Hall' ELSE 'Local ' || local_number || ' Hall' END,
    'Default Hall for members and officers of this local.', 'local_members', 'system', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO portal_circle_memberships (id, circle_id, user_id, user_name, role, muted, muted_tools, starred, joined_at)
  VALUES ('cm-' || md5(portal_circle_id || ':' || target_user), portal_circle_id, target_user, COALESCE(member_name, 'Member'),
    CASE WHEN is_officer_admin THEN 'admin' ELSE 'member' END, false, '[]'::jsonb, true, now())
  ON CONFLICT (circle_id, user_id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    role = EXCLUDED.role;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_sync_local_portal_membership(text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_sync_local_portal_membership(text,text,text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_grievance_member(target_grievance text, target_user text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM grievances g JOIN local_memberships m
      ON m.union_id = g.union_id AND m.local_id = g.local_id AND m.user_id = target_user
    JOIN users u ON u.id = target_user AND u.union_id = g.union_id
    WHERE g.id = target_grievance AND g.member_user_id = target_user
      AND m.status = 'active' AND m.ended_at IS NULL AND m.started_at <= now()
      AND u.archived_at IS NULL AND u.locked_at IS NULL
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_grievance_case_access(target_grievance text, require_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM grievances g
    JOIN users u ON u.id = nullif(current_setting('app.current_user_id', true), '')
      AND u.union_id = g.union_id AND u.archived_at IS NULL AND u.locked_at IS NULL
    WHERE g.id = target_grievance
      AND g.union_id = nullif(current_setting('app.current_union_id', true), '')
      AND (g.local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')
      AND (
        EXISTS (
          SELECT 1 FROM break_glass_grants b WHERE b.grievance_id = g.id AND b.union_id = g.union_id
            AND b.user_id = u.id AND b.revoked_at IS NULL AND b.expires_at > now()
        )
        OR (
          EXISTS (
            SELECT 1 FROM local_memberships m WHERE m.union_id = g.union_id AND m.local_id = g.local_id AND m.user_id = u.id
              AND m.status = 'active' AND m.ended_at IS NULL AND m.started_at <= now()
          )
          AND (
            EXISTS (
              SELECT 1 FROM officer_assignments a WHERE a.union_id = g.union_id AND a.local_id = g.local_id AND a.user_id = u.id
                AND a.position = 'grievance_officer' AND a.revoked_at IS NULL AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
            )
            OR EXISTS (
              SELECT 1 FROM grievance_participants p WHERE p.grievance_id = g.id AND p.user_id = u.id AND p.revoked_at IS NULL
                AND p.relationship <> 'member' AND p.access_level IN ('case_read','case_write')
                AND (p.relationship <> 'case_worker' OR p.access_level = 'case_write')
                AND (NOT require_write OR p.access_level = 'case_write')
            )
            OR (g.privacy_mode = 'standard' AND (
              EXISTS (
                SELECT 1 FROM officer_assignments a WHERE a.union_id = g.union_id AND a.local_id = g.local_id AND a.user_id = u.id
                  AND a.position IN ('president','vice_president') AND a.revoked_at IS NULL AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
              )
              OR EXISTS (
                SELECT 1 FROM authority_delegations d WHERE d.union_id = g.union_id AND d.local_id = g.local_id AND d.delegate_user_id = u.id
                  AND d.revoked_at IS NULL AND d.starts_at <= now() AND d.ends_at > now()
                  AND d.capability = CASE WHEN require_write THEN 'grievances.case.write' ELSE 'grievances.case.read' END
              )
            ))
          )
        )
      )
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_grievance_member(text,text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_grievance_case_access(text,boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_grievance_member(text,text) TO unionops_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_grievance_case_access(text,boolean) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_grievance_summary_access(target_grievance text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM grievances g
    JOIN local_memberships m ON m.union_id = g.union_id AND m.local_id = g.local_id AND m.user_id = nullif(current_setting('app.current_user_id', true), '')
    JOIN users u ON u.id = m.user_id AND u.union_id = g.union_id
    WHERE g.id = target_grievance
      AND g.union_id = nullif(current_setting('app.current_union_id', true), '')
      AND (g.local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')
      AND m.status = 'active' AND m.ended_at IS NULL AND m.started_at <= now()
      AND u.archived_at IS NULL AND u.locked_at IS NULL
      AND (
        (g.privacy_mode = 'standard' AND EXISTS (
          SELECT 1 FROM officer_assignments a WHERE a.union_id = g.union_id AND a.local_id = g.local_id AND a.user_id = u.id
            AND a.position = 'executive_member' AND a.revoked_at IS NULL AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
        ))
        OR EXISTS (
          SELECT 1 FROM grievance_participants p WHERE p.grievance_id = g.id AND p.user_id = u.id
            AND p.relationship <> 'member' AND p.access_level = 'summary' AND p.revoked_at IS NULL
        )
      )
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_grievance_summary_access(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_grievance_summary_access(text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_grievance_create_access(target_union text, target_local text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u JOIN local_memberships m
      ON m.user_id = u.id AND m.union_id = target_union AND m.local_id = target_local
    WHERE u.id = nullif(current_setting('app.current_user_id', true), '') AND u.union_id = target_union
      AND u.archived_at IS NULL AND u.locked_at IS NULL AND m.status = 'active' AND m.ended_at IS NULL AND m.started_at <= now()
      AND target_union = nullif(current_setting('app.current_union_id', true), '')
      AND (target_local = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')
      AND (
        EXISTS (
          SELECT 1 FROM officer_assignments a WHERE a.user_id = u.id AND a.union_id = target_union AND a.local_id = target_local
            AND a.position IN ('president','vice_president','grievance_officer','steward') AND a.revoked_at IS NULL
            AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM authority_delegations d WHERE d.delegate_user_id = u.id AND d.union_id = target_union AND d.local_id = target_local
            AND d.capability = 'grievances.case.write' AND d.revoked_at IS NULL AND d.starts_at <= now() AND d.ends_at > now()
        )
      )
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_grievance_create_access(text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_grievance_create_access(text,text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_org_manage(target_union text, target_local text, capability text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = nullif(current_setting('app.current_user_id', true), '') AND u.union_id = target_union
      AND u.archived_at IS NULL AND u.locked_at IS NULL
      AND target_union = nullif(current_setting('app.current_union_id', true), '')
      AND (target_local = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')
      AND (
        (capability IN ('memberships.manage','officers.manage','circles.create') AND u.roles ?| ARRAY['platform_admin','union_admin','division_admin'])
        OR EXISTS (
          SELECT 1 FROM officer_assignments a JOIN local_memberships m
            ON m.user_id = a.user_id AND m.union_id = a.union_id AND m.local_id = a.local_id
          WHERE a.user_id = u.id AND a.union_id = target_union AND a.local_id = target_local
            AND a.position IN ('president','vice_president') AND a.revoked_at IS NULL
            AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())
            AND m.status = 'active' AND m.ended_at IS NULL AND m.started_at <= now()
        )
      )
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_org_manage(text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_org_manage(text,text,text) TO unionops_app;
--> statement-breakpoint
DO $$
DECLARE t text;
DECLARE p text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'grievances','bumping_cases','member_communications','scheduled_meetings','attachment_meta','documents',
    'time_entries','job_codes','work_sites','time_workers','time_expected_windows','checkin_schedules','checkin_answers',
    'local_meeting_schedules','union_meetings','rsvp_responses','pto_requests','time_shifts','pto_balances',
    'time_worker_groups','time_ot_policies','time_shift_series','pto_accrual_policies','payroll_export_profiles','tasks',
    'discussion_threads','discussion_posts','officer_learning_users','officer_learning_local_settings',
    'informal_log_entries','officer_roster','meeting_minutes','ledger_entries','committees','election_cycles',
    'travel_authorizations','cash_advances','expense_claims','expense_submissions','poll_definitions','poll_responses',
    'local_public_tool_settings','bylaw_drafts','proposal_packages','proposal_rows','proposal_events','proposal_publications',
    'local_memberships','officer_assignments','authority_delegations','committee_memberships'
  ] LOOP
    p := t || '_tenant_isolation';
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (union_id = nullif(current_setting(''app.current_union_id'', true), '''') AND (local_id = nullif(current_setting(''app.current_local_id'', true), '''') OR current_setting(''app.current_cross_local'', true) = ''true'')) WITH CHECK (union_id = nullif(current_setting(''app.current_union_id'', true), '''') AND (local_id = nullif(current_setting(''app.current_local_id'', true), '''') OR current_setting(''app.current_cross_local'', true) = ''true''))', p, t);
  END LOOP;
END $$;
--> statement-breakpoint
DROP POLICY IF EXISTS grievances_tenant_isolation ON grievances;
--> statement-breakpoint
CREATE POLICY grievances_tenant_isolation ON grievances FOR SELECT
USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (
  app_grievance_case_access(id, false)
  OR app_grievance_summary_access(id)
  OR app_grievance_member(id, nullif(current_setting('app.current_user_id', true), ''))
));
--> statement-breakpoint
CREATE POLICY grievances_case_insert ON grievances FOR INSERT
WITH CHECK (app_grievance_create_access(union_id, local_id));
--> statement-breakpoint
CREATE POLICY grievances_case_update ON grievances FOR UPDATE
USING (app_grievance_case_access(id, true)) WITH CHECK (app_grievance_case_access(id, true));
--> statement-breakpoint
CREATE POLICY grievances_case_delete ON grievances FOR DELETE
USING (app_grievance_case_access(id, true));
--> statement-breakpoint
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
--> statement-breakpoint
CREATE POLICY audit_log_tenant_isolation ON audit_log FOR ALL
USING (
  (circle_id IS NULL AND (union_id IS NULL OR union_id = nullif(current_setting('app.current_union_id', true), '')))
  OR (circle_id IS NOT NULL AND union_id = nullif(current_setting('app.current_union_id', true), '') AND app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), '')))
)
WITH CHECK (
  (circle_id IS NULL AND (union_id IS NULL OR union_id = nullif(current_setting('app.current_union_id', true), '')))
  OR (circle_id IS NOT NULL AND union_id = nullif(current_setting('app.current_union_id', true), '') AND app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), '')))
);
--> statement-breakpoint
ALTER TABLE rsvp_tokens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS rsvp_tokens_tenant_isolation ON rsvp_tokens;
--> statement-breakpoint
CREATE POLICY rsvp_tokens_tenant_isolation ON rsvp_tokens FOR ALL
USING (EXISTS (
  SELECT 1 FROM union_meetings m WHERE m.id = rsvp_tokens.meeting_id
    AND m.union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (m.local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM union_meetings m WHERE m.id = rsvp_tokens.meeting_id
    AND m.union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (m.local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')
));
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['grievance_events','grievance_notes','grievance_outcomes','grievance_participants','grievance_member_updates','grievance_attachment_shares'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_parent_isolation', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_parent_write', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (app_grievance_case_access(grievance_id, false))', t || '_parent_isolation', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (app_grievance_case_access(grievance_id, true))', t || '_parent_write', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (app_grievance_case_access(grievance_id, true)) WITH CHECK (app_grievance_case_access(grievance_id, true))', t || '_parent_write_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (app_grievance_case_access(grievance_id, true))', t || '_parent_write_delete', t);
  END LOOP;
END $$;
--> statement-breakpoint
DROP POLICY IF EXISTS grievance_member_updates_parent_isolation ON grievance_member_updates;
--> statement-breakpoint
ALTER TABLE grievance_member_updates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY grievance_member_updates_member_safe_read ON grievance_member_updates FOR SELECT
USING (withdrawn_at IS NULL AND app_grievance_member(grievance_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY grievance_member_updates_case_team_read ON grievance_member_updates FOR SELECT
USING (app_grievance_case_access(grievance_id, false));
--> statement-breakpoint
DROP POLICY IF EXISTS grievance_attachment_shares_parent_isolation ON grievance_attachment_shares;
--> statement-breakpoint
ALTER TABLE grievance_attachment_shares ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY grievance_attachment_shares_member_safe_read ON grievance_attachment_shares FOR SELECT
USING (revoked_at IS NULL AND app_grievance_member(grievance_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY grievance_attachment_shares_case_team_read ON grievance_attachment_shares FOR SELECT
USING (app_grievance_case_access(grievance_id, false));
--> statement-breakpoint
CREATE POLICY local_memberships_self_or_scope ON local_memberships FOR SELECT
USING (user_id = nullif(current_setting('app.current_user_id', true), '') OR (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')));
--> statement-breakpoint
ALTER TABLE local_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY officer_assignments_self_or_scope ON officer_assignments FOR SELECT
USING (user_id = nullif(current_setting('app.current_user_id', true), '') OR (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')));
--> statement-breakpoint
ALTER TABLE officer_assignments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY authority_delegations_self_or_scope ON authority_delegations FOR SELECT
USING (delegate_user_id = nullif(current_setting('app.current_user_id', true), '') OR grantor_user_id = nullif(current_setting('app.current_user_id', true), '') OR (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')));
--> statement-breakpoint
ALTER TABLE authority_delegations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY committee_memberships_self_or_scope ON committee_memberships FOR SELECT
USING (user_id = nullif(current_setting('app.current_user_id', true), '') OR (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true')));
--> statement-breakpoint
ALTER TABLE committee_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS local_memberships_tenant_isolation ON local_memberships;
--> statement-breakpoint
DROP POLICY IF EXISTS officer_assignments_tenant_isolation ON officer_assignments;
--> statement-breakpoint
DROP POLICY IF EXISTS authority_delegations_tenant_isolation ON authority_delegations;
--> statement-breakpoint
DROP POLICY IF EXISTS committee_memberships_tenant_isolation ON committee_memberships;
--> statement-breakpoint
CREATE POLICY local_memberships_manage_insert ON local_memberships FOR INSERT
WITH CHECK (app_org_manage(union_id, local_id, 'memberships.manage'));
--> statement-breakpoint
CREATE POLICY local_memberships_manage_update ON local_memberships FOR UPDATE
USING (app_org_manage(union_id, local_id, 'memberships.manage')) WITH CHECK (app_org_manage(union_id, local_id, 'memberships.manage'));
--> statement-breakpoint
CREATE POLICY local_memberships_manage_delete ON local_memberships FOR DELETE
USING (app_org_manage(union_id, local_id, 'memberships.manage'));
--> statement-breakpoint
CREATE POLICY officer_assignments_manage_insert ON officer_assignments FOR INSERT
WITH CHECK (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
CREATE POLICY officer_assignments_manage_update ON officer_assignments FOR UPDATE
USING (app_org_manage(union_id, local_id, 'officers.manage')) WITH CHECK (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
CREATE POLICY officer_assignments_manage_delete ON officer_assignments FOR DELETE
USING (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
CREATE POLICY authority_delegations_manage_insert ON authority_delegations FOR INSERT
WITH CHECK (app_org_manage(union_id, local_id, 'delegations.manage'));
--> statement-breakpoint
CREATE POLICY authority_delegations_manage_update ON authority_delegations FOR UPDATE
USING (app_org_manage(union_id, local_id, 'delegations.manage')) WITH CHECK (app_org_manage(union_id, local_id, 'delegations.manage'));
--> statement-breakpoint
CREATE POLICY authority_delegations_manage_delete ON authority_delegations FOR DELETE
USING (app_org_manage(union_id, local_id, 'delegations.manage'));
--> statement-breakpoint
CREATE POLICY committee_memberships_manage_insert ON committee_memberships FOR INSERT
WITH CHECK (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
CREATE POLICY committee_memberships_manage_update ON committee_memberships FOR UPDATE
USING (app_org_manage(union_id, local_id, 'officers.manage')) WITH CHECK (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
CREATE POLICY committee_memberships_manage_delete ON committee_memberships FOR DELETE
USING (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
DROP POLICY IF EXISTS officer_roster_tenant_isolation ON officer_roster;
--> statement-breakpoint
ALTER TABLE officer_roster ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY officer_roster_member_scope ON officer_roster FOR SELECT
USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY officer_roster_manage_insert ON officer_roster FOR INSERT
WITH CHECK (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
CREATE POLICY officer_roster_manage_update ON officer_roster FOR UPDATE
USING (app_org_manage(union_id, local_id, 'officers.manage')) WITH CHECK (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
CREATE POLICY officer_roster_manage_delete ON officer_roster FOR DELETE
USING (app_org_manage(union_id, local_id, 'officers.manage'));
--> statement-breakpoint
ALTER TABLE break_glass_grants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY break_glass_grants_actor_read ON break_glass_grants FOR SELECT
USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_create_break_glass_grant(target_grievance text, grant_reason text)
RETURNS TABLE(grant_id text, union_id text, local_id text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_id text := nullif(current_setting('app.current_user_id', true), '');
DECLARE current_union text := nullif(current_setting('app.current_union_id', true), '');
DECLARE target_row grievances%ROWTYPE;
DECLARE new_id text := gen_random_uuid()::text;
DECLARE expiry timestamptz := now() + interval '30 minutes';
BEGIN
  IF current_setting('app.current_mfa_verified', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'verified MFA required';
  END IF;
  IF length(trim(grant_reason)) < 20 OR length(trim(grant_reason)) > 2000 THEN
    RAISE EXCEPTION 'break-glass reason must be 20 to 2000 characters';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users u WHERE u.id = actor_id AND u.union_id = current_union
    AND u.roles ? 'platform_admin' AND u.archived_at IS NULL AND u.locked_at IS NULL) THEN
    RAISE EXCEPTION 'active platform administrator required';
  END IF;
  SELECT g.* INTO target_row FROM grievances g WHERE g.id = target_grievance AND g.union_id = current_union;
  IF target_row.id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO break_glass_grants (id, union_id, local_id, grievance_id, user_id, reason, granted_at, expires_at)
    VALUES (new_id, target_row.union_id, target_row.local_id, target_row.id, actor_id, trim(grant_reason), now(), expiry);
  RETURN QUERY SELECT new_id, target_row.union_id, target_row.local_id, expiry;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_create_break_glass_grant(text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_create_break_glass_grant(text,text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_revoke_break_glass_grant(target_grievance text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_id text := nullif(current_setting('app.current_user_id', true), '');
DECLARE current_union text := nullif(current_setting('app.current_union_id', true), '');
DECLARE revoked_id text;
BEGIN
  IF current_setting('app.current_mfa_verified', true) IS DISTINCT FROM 'true'
    OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = actor_id AND u.union_id = current_union
      AND u.roles ? 'platform_admin' AND u.archived_at IS NULL AND u.locked_at IS NULL) THEN
    RAISE EXCEPTION 'verified platform administrator MFA required';
  END IF;
  UPDATE break_glass_grants b SET revoked_at = now()
    WHERE b.grievance_id = target_grievance AND b.union_id = current_union AND b.user_id = actor_id
      AND b.revoked_at IS NULL AND b.expires_at > now()
    RETURNING b.id INTO revoked_id;
  RETURN revoked_id;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_revoke_break_glass_grant(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_revoke_break_glass_grant(text) TO unionops_app;
--> statement-breakpoint
DROP POLICY IF EXISTS local_memberships_tenant_isolation ON local_memberships;
--> statement-breakpoint
DROP POLICY IF EXISTS officer_assignments_tenant_isolation ON officer_assignments;
--> statement-breakpoint
DROP POLICY IF EXISTS authority_delegations_tenant_isolation ON authority_delegations;
--> statement-breakpoint
DROP POLICY IF EXISTS committee_memberships_tenant_isolation ON committee_memberships;
--> statement-breakpoint
ALTER TABLE portal_circles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_circles_member_scope ON portal_circles FOR SELECT
USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND app_portal_circle_member(id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_circles_creator_insert ON portal_circles FOR INSERT
WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '')
  AND created_by_id = nullif(current_setting('app.current_user_id', true), '')
  AND app_org_manage(union_id, local_id, 'circles.create'));
--> statement-breakpoint
CREATE POLICY portal_circles_admin_update ON portal_circles FOR UPDATE
USING (app_portal_circle_admin(id, nullif(current_setting('app.current_user_id', true), '')))
WITH CHECK (app_portal_circle_admin(id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_circles_admin_delete ON portal_circles FOR DELETE
USING (app_portal_circle_admin(id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
ALTER TABLE portal_circle_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_member_scope ON portal_circle_memberships FOR SELECT
USING (app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_creator_insert ON portal_circle_memberships FOR INSERT
WITH CHECK (app_portal_circle_creator(circle_id, nullif(current_setting('app.current_user_id', true), '')) OR app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_admin_update ON portal_circle_memberships FOR UPDATE
USING (app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), '')))
WITH CHECK (app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_circle_memberships_admin_delete ON portal_circle_memberships FOR DELETE
USING (app_portal_circle_admin(circle_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['portal_bulletin_posts','portal_actions','portal_calendar_events','portal_binder_items','portal_floor_messages','portal_roll_call_questions','portal_pipeline_boards','portal_momentum_items'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (app_portal_circle_member(circle_id, nullif(current_setting(''app.current_user_id'', true), '''')) AND union_id = nullif(current_setting(''app.current_union_id'', true), ''''))', t || '_circle_member', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (app_portal_circle_writer(circle_id, nullif(current_setting(''app.current_user_id'', true), '''')) AND union_id = nullif(current_setting(''app.current_union_id'', true), ''''))', t || '_circle_member_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (app_portal_circle_writer(circle_id, nullif(current_setting(''app.current_user_id'', true), '''')) AND union_id = nullif(current_setting(''app.current_union_id'', true), '''')) WITH CHECK (app_portal_circle_writer(circle_id, nullif(current_setting(''app.current_user_id'', true), '''')) AND union_id = nullif(current_setting(''app.current_union_id'', true), ''''))', t || '_circle_member_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (app_portal_circle_writer(circle_id, nullif(current_setting(''app.current_user_id'', true), '''')) AND union_id = nullif(current_setting(''app.current_union_id'', true), ''''))', t || '_circle_member_delete', t);
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE portal_roll_call_answers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_roll_call_answers_circle_member ON portal_roll_call_answers FOR SELECT
USING (app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_roll_call_answers_circle_member_insert ON portal_roll_call_answers FOR INSERT
WITH CHECK (app_portal_circle_writer(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_roll_call_answers_circle_member_update ON portal_roll_call_answers FOR UPDATE
USING (app_portal_circle_writer(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')))
WITH CHECK (app_portal_circle_writer(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_roll_call_answers_circle_member_delete ON portal_roll_call_answers FOR DELETE
USING (app_portal_circle_writer(circle_id, nullif(current_setting('app.current_user_id', true), ''))
  AND EXISTS (SELECT 1 FROM portal_circles c WHERE c.id = circle_id AND c.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
ALTER TABLE portal_bulletin_comments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_bulletin_comments_circle_member ON portal_bulletin_comments FOR SELECT
USING (EXISTS (SELECT 1 FROM portal_bulletin_posts p WHERE p.id = post_id AND app_portal_circle_member(p.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND p.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_bulletin_comments_circle_member_insert ON portal_bulletin_comments FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM portal_bulletin_posts p WHERE p.id = post_id AND app_portal_circle_writer(p.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND p.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_bulletin_comments_circle_member_update ON portal_bulletin_comments FOR UPDATE
USING (EXISTS (SELECT 1 FROM portal_bulletin_posts p WHERE p.id = post_id AND app_portal_circle_writer(p.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND p.union_id = nullif(current_setting('app.current_union_id', true), '')))
WITH CHECK (EXISTS (SELECT 1 FROM portal_bulletin_posts p WHERE p.id = post_id AND app_portal_circle_writer(p.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND p.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_bulletin_comments_circle_member_delete ON portal_bulletin_comments FOR DELETE
USING (EXISTS (SELECT 1 FROM portal_bulletin_posts p WHERE p.id = post_id AND app_portal_circle_writer(p.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND p.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['portal_pipeline_columns','portal_pipeline_cards'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE portal_pipeline_columns ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE portal_pipeline_cards ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_pipeline_columns_circle_member ON portal_pipeline_columns FOR SELECT
USING (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_member(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_pipeline_columns_circle_writer ON portal_pipeline_columns FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_writer(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_pipeline_columns_circle_writer_update ON portal_pipeline_columns FOR UPDATE
USING (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_writer(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')))
WITH CHECK (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_writer(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_pipeline_columns_circle_writer_delete ON portal_pipeline_columns FOR DELETE
USING (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_writer(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_pipeline_cards_circle_member ON portal_pipeline_cards FOR SELECT
USING (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_member(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_pipeline_cards_circle_writer ON portal_pipeline_cards FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_writer(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_pipeline_cards_circle_writer_update ON portal_pipeline_cards FOR UPDATE
USING (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_writer(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')))
WITH CHECK (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_writer(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_pipeline_cards_circle_writer_delete ON portal_pipeline_cards FOR DELETE
USING (EXISTS (SELECT 1 FROM portal_pipeline_boards b WHERE b.id = board_id AND app_portal_circle_writer(b.circle_id, nullif(current_setting('app.current_user_id', true), '')) AND b.union_id = nullif(current_setting('app.current_union_id', true), '')));
--> statement-breakpoint
ALTER TABLE portal_dispatch_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_dispatch_self_member ON portal_dispatch_items FOR ALL
USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND user_id = nullif(current_setting('app.current_user_id', true), '') AND app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), '')))
WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND user_id = nullif(current_setting('app.current_user_id', true), '') AND app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
ALTER TABLE portal_sidebar_threads ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_sidebar_participant ON portal_sidebar_threads FOR ALL
USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND app_portal_sidebar_participant(id, nullif(current_setting('app.current_user_id', true), '')))
WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (created_by_id = nullif(current_setting('app.current_user_id', true), '') OR app_portal_sidebar_participant(id, nullif(current_setting('app.current_user_id', true), ''))));
--> statement-breakpoint
ALTER TABLE portal_sidebar_participants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_sidebar_participants_participant ON portal_sidebar_participants FOR SELECT
USING (user_id = nullif(current_setting('app.current_user_id', true), '') OR app_portal_sidebar_participant(thread_id, nullif(current_setting('app.current_user_id', true), '')) OR app_portal_sidebar_creator(thread_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_sidebar_participants_creator_insert ON portal_sidebar_participants FOR INSERT
WITH CHECK (app_portal_sidebar_creator(thread_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_sidebar_participants_self_update ON portal_sidebar_participants FOR UPDATE
USING (user_id = nullif(current_setting('app.current_user_id', true), '') OR app_portal_sidebar_creator(thread_id, nullif(current_setting('app.current_user_id', true), '')))
WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), '') OR app_portal_sidebar_creator(thread_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
CREATE POLICY portal_sidebar_participants_self_delete ON portal_sidebar_participants FOR DELETE
USING (user_id = nullif(current_setting('app.current_user_id', true), '') OR app_portal_sidebar_creator(thread_id, nullif(current_setting('app.current_user_id', true), '')));
--> statement-breakpoint
ALTER TABLE portal_sidebar_messages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portal_sidebar_messages_participant ON portal_sidebar_messages FOR ALL
USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND app_portal_sidebar_participant(thread_id, nullif(current_setting('app.current_user_id', true), '')))
WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND app_portal_sidebar_participant(thread_id, nullif(current_setting('app.current_user_id', true), '')));
