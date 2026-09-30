-- Observability v2: optional union stamp on events + per-union alert routing + email format.
ALTER TABLE observability_events
  ADD COLUMN IF NOT EXISTS union_id text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS observability_events_union_ts_idx
  ON observability_events (union_id, ts DESC);
--> statement-breakpoint
ALTER TABLE observability_alert_rules
  ADD COLUMN IF NOT EXISTS union_id text;
--> statement-breakpoint
ALTER TABLE observability_alert_rules
  ADD COLUMN IF NOT EXISTS recipients_by_union jsonb;
--> statement-breakpoint
ALTER TABLE observability_alert_rules
  ADD COLUMN IF NOT EXISTS email_format text NOT NULL DEFAULT 'multipart';
--> statement-breakpoint
ALTER TABLE observability_alert_rules
  DROP CONSTRAINT IF EXISTS observability_alert_rules_email_format_check;
--> statement-breakpoint
ALTER TABLE observability_alert_rules
  ADD CONSTRAINT observability_alert_rules_email_format_check
  CHECK (email_format IN ('multipart', 'plain'));
--> statement-breakpoint
-- Firings may record a union bucket for fan-out sends.
ALTER TABLE observability_alert_firings
  ADD COLUMN IF NOT EXISTS union_id text;
