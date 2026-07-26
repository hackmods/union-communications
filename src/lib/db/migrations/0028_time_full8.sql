-- Phase 8 full: workers directory, OT policies, shift recurrence, accrual formulas, groups, payroll hooks.

ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS employee_number text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS hire_date text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS employment_type text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS default_job_code_id text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS supervisor_worker_id text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS group_ids jsonb;

ALTER TABLE time_shifts ADD COLUMN IF NOT EXISTS series_id text;
ALTER TABLE time_shifts ADD COLUMN IF NOT EXISTS series_occurrence_date text;

CREATE TABLE IF NOT EXISTS time_worker_groups (
  id text PRIMARY KEY,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  member_worker_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_worker_groups_union_local_idx
  ON time_worker_groups (union_id, local_id);

ALTER TABLE time_worker_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS time_worker_groups_tenant_isolation ON time_worker_groups;
CREATE POLICY time_worker_groups_tenant_isolation ON time_worker_groups
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS time_ot_policies (
  id text PRIMARY KEY,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  name text NOT NULL,
  pay_period_type text NOT NULL,
  pay_period_days integer,
  pay_period_anchor text,
  daily_regular_hours real NOT NULL DEFAULT 8,
  daily_ot_threshold real NOT NULL DEFAULT 8,
  weekly_regular_hours real NOT NULL DEFAULT 40,
  daily_double_threshold real,
  ot_multiplier real NOT NULL DEFAULT 1.5,
  double_time_multiplier real NOT NULL DEFAULT 2,
  holiday_dates jsonb,
  holiday_multiplier real NOT NULL DEFAULT 2,
  category_ot_eligible jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_ot_policies_union_local_idx
  ON time_ot_policies (union_id, local_id);

ALTER TABLE time_ot_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS time_ot_policies_tenant_isolation ON time_ot_policies;
CREATE POLICY time_ot_policies_tenant_isolation ON time_ot_policies
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS time_shift_series (
  id text PRIMARY KEY,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  label text NOT NULL,
  start_time text NOT NULL,
  duration_minutes integer NOT NULL,
  category text NOT NULL,
  site_id text,
  job_code_id text,
  assigned_worker_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  recurrence jsonb NOT NULL,
  status text NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_shift_series_union_local_idx
  ON time_shift_series (union_id, local_id);

ALTER TABLE time_shift_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS time_shift_series_tenant_isolation ON time_shift_series;
CREATE POLICY time_shift_series_tenant_isolation ON time_shift_series
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS pto_accrual_policies (
  id text PRIMARY KEY,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  name text NOT NULL,
  pto_type text NOT NULL,
  formula_type text NOT NULL,
  hours_worked_rate real,
  eligible_categories jsonb,
  fixed_hours_per_period real,
  period_days integer,
  tenure_tiers jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pto_accrual_policies_union_local_idx
  ON pto_accrual_policies (union_id, local_id);

ALTER TABLE pto_accrual_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pto_accrual_policies_tenant_isolation ON pto_accrual_policies;
CREATE POLICY pto_accrual_policies_tenant_isolation ON pto_accrual_policies
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS payroll_export_profiles (
  id text PRIMARY KEY,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  name text NOT NULL,
  vendor text NOT NULL,
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_url text,
  include_ot_breakdown boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payroll_export_profiles_union_local_idx
  ON payroll_export_profiles (union_id, local_id);

ALTER TABLE payroll_export_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_export_profiles_tenant_isolation ON payroll_export_profiles;
CREATE POLICY payroll_export_profiles_tenant_isolation ON payroll_export_profiles
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
