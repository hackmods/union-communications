-- SEC-003 / ADR-008: Row-Level Security for tenant-scoped tables.
-- App sets app.current_union_id, app.current_local_id, app.current_cross_local
-- via SET LOCAL (see src/lib/db/rls-context.ts) inside request transactions.

ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bumping_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grievances_tenant_isolation ON grievances;
CREATE POLICY grievances_tenant_isolation ON grievances
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS bumping_cases_tenant_isolation ON bumping_cases;
CREATE POLICY bumping_cases_tenant_isolation ON bumping_cases
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS audit_log_tenant_isolation ON audit_log;
CREATE POLICY audit_log_tenant_isolation ON audit_log
  USING (
    union_id IS NULL
    OR union_id = nullif(current_setting('app.current_union_id', true), '')
  );

DROP POLICY IF EXISTS member_communications_tenant_isolation ON member_communications;
CREATE POLICY member_communications_tenant_isolation ON member_communications
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS scheduled_meetings_tenant_isolation ON scheduled_meetings;
CREATE POLICY scheduled_meetings_tenant_isolation ON scheduled_meetings
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

-- Migration role / table owner bypasses RLS by default. Application DB role
-- should be a non-owner role without BYPASSRLS for these policies to bind.
