-- SEC-003 / ADR-008: Row-Level Security for workforce time tables.
-- App sets app.current_union_id, app.current_local_id, app.current_cross_local
-- via SET LOCAL (see src/lib/db/rls-context.ts) inside request transactions.

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_expected_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS time_entries_tenant_isolation ON time_entries;
CREATE POLICY time_entries_tenant_isolation ON time_entries
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS job_codes_tenant_isolation ON job_codes;
CREATE POLICY job_codes_tenant_isolation ON job_codes
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS work_sites_tenant_isolation ON work_sites;
CREATE POLICY work_sites_tenant_isolation ON work_sites
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS time_workers_tenant_isolation ON time_workers;
CREATE POLICY time_workers_tenant_isolation ON time_workers
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS time_expected_windows_tenant_isolation ON time_expected_windows;
CREATE POLICY time_expected_windows_tenant_isolation ON time_expected_windows
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
