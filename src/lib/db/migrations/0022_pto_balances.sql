-- Time 8c.3: PTO accrual balances (manual set/adjust; approve decrements hoursRequested).
CREATE TABLE IF NOT EXISTS pto_balances (
  id text PRIMARY KEY,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  worker_id text NOT NULL,
  pto_type text NOT NULL,
  hours_balance real NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_id text
);

CREATE INDEX IF NOT EXISTS pto_balances_union_local_idx
  ON pto_balances (union_id, local_id);

CREATE INDEX IF NOT EXISTS pto_balances_worker_type_idx
  ON pto_balances (worker_id, pto_type);

ALTER TABLE pto_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pto_balances_tenant_isolation ON pto_balances;
CREATE POLICY pto_balances_tenant_isolation ON pto_balances
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
