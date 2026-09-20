-- ADR-020 production reconciliation.
--
-- A historical journal edit left migrations 0027-0029 older than the live
-- journal tail, so Drizzle correctly considered them no longer pending. Reapply
-- their idempotent effects at a new append-only timestamp, fold the sole legacy
-- data migration into the Drizzle ledger, then remove the parallel metadata
-- table. Do not fabricate historical journal rows.

-- 0027_hub_social
ALTER TABLE "discussion_posts" ADD COLUMN IF NOT EXISTS "mentioned_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN IF NOT EXISTS "reactions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "discussion_posts" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "mentioned_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reactions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "tasks" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint

-- 0028_time_full8
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS employee_number text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS email text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS phone text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS job_title text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS department text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS hire_date text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS employment_type text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS default_job_code_id text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS supervisor_worker_id text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS notes text;--> statement-breakpoint
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS group_ids jsonb;--> statement-breakpoint
ALTER TABLE time_shifts ADD COLUMN IF NOT EXISTS series_id text;--> statement-breakpoint
ALTER TABLE time_shifts ADD COLUMN IF NOT EXISTS series_occurrence_date text;--> statement-breakpoint

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
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS time_worker_groups_union_local_idx ON time_worker_groups (union_id, local_id);--> statement-breakpoint
ALTER TABLE time_worker_groups ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS time_worker_groups_tenant_isolation ON time_worker_groups;--> statement-breakpoint
CREATE POLICY time_worker_groups_tenant_isolation ON time_worker_groups
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );--> statement-breakpoint

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
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS time_ot_policies_union_local_idx ON time_ot_policies (union_id, local_id);--> statement-breakpoint
ALTER TABLE time_ot_policies ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS time_ot_policies_tenant_isolation ON time_ot_policies;--> statement-breakpoint
CREATE POLICY time_ot_policies_tenant_isolation ON time_ot_policies
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );--> statement-breakpoint

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
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS time_shift_series_union_local_idx ON time_shift_series (union_id, local_id);--> statement-breakpoint
ALTER TABLE time_shift_series ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS time_shift_series_tenant_isolation ON time_shift_series;--> statement-breakpoint
CREATE POLICY time_shift_series_tenant_isolation ON time_shift_series
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );--> statement-breakpoint

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
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS pto_accrual_policies_union_local_idx ON pto_accrual_policies (union_id, local_id);--> statement-breakpoint
ALTER TABLE pto_accrual_policies ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS pto_accrual_policies_tenant_isolation ON pto_accrual_policies;--> statement-breakpoint
CREATE POLICY pto_accrual_policies_tenant_isolation ON pto_accrual_policies
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );--> statement-breakpoint

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
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payroll_export_profiles_union_local_idx ON payroll_export_profiles (union_id, local_id);--> statement-breakpoint
ALTER TABLE payroll_export_profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS payroll_export_profiles_tenant_isolation ON payroll_export_profiles;--> statement-breakpoint
CREATE POLICY payroll_export_profiles_tenant_isolation ON payroll_export_profiles
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );--> statement-breakpoint

-- 0029_time_8f
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_photo_attachment_id text;--> statement-breakpoint
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_photo_attachment_id text;--> statement-breakpoint
ALTER TABLE attachment_meta ADD COLUMN IF NOT EXISTS time_entry_id text;--> statement-breakpoint
ALTER TABLE attachment_meta ADD COLUMN IF NOT EXISTS punch_kind text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS attachment_meta_time_entry_idx ON attachment_meta (time_entry_id);--> statement-breakpoint

-- Former data-migrations/0001_site_admin_backfill.sql
UPDATE "users"
SET "is_demo" = true
WHERE "is_demo" = false AND "email" LIKE '%unionops.test%';--> statement-breakpoint
UPDATE "unions"
SET "is_demo" = true
WHERE "is_demo" = false AND "id" IN ('union-opseu');--> statement-breakpoint
UPDATE "locals"
SET "is_demo" = true
WHERE "is_demo" = false
  AND "union_id" IN (SELECT "id" FROM "unions" WHERE "is_demo" = true);--> statement-breakpoint
UPDATE "divisions"
SET "is_demo" = true
WHERE "is_demo" = false
  AND "union_id" IN (SELECT "id" FROM "unions" WHERE "is_demo" = true);--> statement-breakpoint

-- platform_meta was health/version theater outside the Drizzle journal.
DROP TABLE IF EXISTS "platform_meta";
