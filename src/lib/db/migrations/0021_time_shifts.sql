-- Time 8c.2: shift scheduling (no recurrence / auto-timesheet).
CREATE TABLE IF NOT EXISTS time_shifts (
  id text PRIMARY KEY,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  label text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  category text NOT NULL,
  site_id text,
  job_code_id text,
  assigned_worker_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_shifts_union_local_idx
  ON time_shifts (union_id, local_id);

ALTER TABLE time_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS time_shifts_tenant_isolation ON time_shifts;
CREATE POLICY time_shifts_tenant_isolation ON time_shifts
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS shift_id text;
