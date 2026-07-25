-- Time 8c.1: PTO leave requests (no accrual balances).
CREATE TABLE IF NOT EXISTS pto_requests (
  id text PRIMARY KEY,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  worker_id text NOT NULL,
  worker_name text NOT NULL,
  pto_type text NOT NULL,
  status text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  hours_requested real,
  notes text,
  requested_by_id text NOT NULL,
  approved_by_id text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pto_requests_union_local_idx
  ON pto_requests (union_id, local_id);

ALTER TABLE pto_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pto_requests_tenant_isolation ON pto_requests;
CREATE POLICY pto_requests_tenant_isolation ON pto_requests
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
