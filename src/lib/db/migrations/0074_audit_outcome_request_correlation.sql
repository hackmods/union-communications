-- Distinguish newly recorded outcomes and correlate security events by request.
-- Existing rows receive "unknown" because their outcome cannot be inferred.
ALTER TABLE audit_log
  ADD COLUMN outcome text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_outcome_check
  CHECK (outcome IN ('success', 'denied', 'error', 'unknown'));
--> statement-breakpoint
ALTER TABLE audit_log ALTER COLUMN outcome SET DEFAULT 'success';
--> statement-breakpoint
ALTER TABLE audit_log ADD COLUMN request_id text;
--> statement-breakpoint
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_request_id_check
  CHECK (
    request_id IS NULL OR request_id ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );
--> statement-breakpoint
CREATE INDEX audit_log_request_idx ON audit_log (request_id)
  WHERE request_id IS NOT NULL;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON audit_log FROM unionops_app;
