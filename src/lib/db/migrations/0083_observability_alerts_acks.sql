-- Observability issue acks + email alert rules (platform-admin only).
CREATE TABLE observability_issue_acks (
  fingerprint text PRIMARY KEY NOT NULL CHECK (length(fingerprint) BETWEEN 8 AND 64),
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  acknowledged_by text NOT NULL,
  note text CHECK (note IS NULL OR length(note) <= 500)
);
--> statement-breakpoint
CREATE TABLE observability_alert_rules (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  enabled boolean NOT NULL DEFAULT true,
  min_level text NOT NULL DEFAULT 'error' CHECK (min_level IN ('error', 'warn', 'info')),
  sources text[] CHECK (
    sources IS NULL
    OR (
      cardinality(sources) BETWEEN 1 AND 4
      AND sources <@ ARRAY['server', 'client', 'cron', 'edge']::text[]
    )
  ),
  fingerprint text CHECK (fingerprint IS NULL OR length(fingerprint) BETWEEN 8 AND 64),
  threshold_count integer NOT NULL DEFAULT 5 CHECK (threshold_count BETWEEN 1 AND 10000),
  window_minutes integer NOT NULL DEFAULT 15 CHECK (window_minutes BETWEEN 1 AND 10080),
  cooldown_minutes integer NOT NULL DEFAULT 60 CHECK (cooldown_minutes BETWEEN 1 AND 10080),
  recipients text[] NOT NULL CHECK (cardinality(recipients) BETWEEN 1 AND 20),
  created_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX observability_alert_rules_enabled_idx ON observability_alert_rules (enabled);
--> statement-breakpoint
CREATE TABLE observability_alert_firings (
  id text PRIMARY KEY NOT NULL,
  rule_id text NOT NULL REFERENCES observability_alert_rules(id) ON DELETE CASCADE,
  fingerprint text,
  fired_at timestamp with time zone NOT NULL DEFAULT now(),
  event_count integer NOT NULL CHECK (event_count >= 0),
  message_id text
);
--> statement-breakpoint
CREATE INDEX observability_alert_firings_rule_idx ON observability_alert_firings (rule_id, fired_at DESC);
--> statement-breakpoint
CREATE INDEX observability_alert_firings_fp_idx ON observability_alert_firings (fingerprint, fired_at DESC);
--> statement-breakpoint
ALTER TABLE observability_issue_acks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE observability_issue_acks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY observability_issue_acks_operator_all ON observability_issue_acks
  FOR ALL USING (public.customization_root(NULL, true))
  WITH CHECK (public.customization_root(NULL, true));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON observability_issue_acks TO unionops_app;
--> statement-breakpoint
ALTER TABLE observability_alert_rules ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE observability_alert_rules FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY observability_alert_rules_operator_all ON observability_alert_rules
  FOR ALL USING (public.customization_root(NULL, true))
  WITH CHECK (public.customization_root(NULL, true));
--> statement-breakpoint
-- Cron evaluator needs to read enabled rules without platform-admin GUC.
CREATE POLICY observability_alert_rules_cron_read ON observability_alert_rules
  FOR SELECT USING (
    current_setting('app.current_retention_job', true) = 'true'
    OR public.customization_root(NULL, true)
  );
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON observability_alert_rules TO unionops_app;
--> statement-breakpoint
ALTER TABLE observability_alert_firings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE observability_alert_firings FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY observability_alert_firings_insert ON observability_alert_firings
  FOR INSERT WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY observability_alert_firings_operator_read ON observability_alert_firings
  FOR SELECT USING (
    current_setting('app.current_retention_job', true) = 'true'
    OR public.customization_root(NULL, true)
  );
--> statement-breakpoint
-- Cron also needs to read acks to skip acknowledged fingerprints.
CREATE POLICY observability_issue_acks_cron_read ON observability_issue_acks
  FOR SELECT USING (
    current_setting('app.current_retention_job', true) = 'true'
    OR public.customization_root(NULL, true)
  );
--> statement-breakpoint
GRANT SELECT, INSERT ON observability_alert_firings TO unionops_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON observability_alert_firings FROM unionops_app;
--> statement-breakpoint
-- Cron evaluator must count recent events without a platform-admin session.
CREATE POLICY observability_events_cron_read ON observability_events
  FOR SELECT USING (
    current_setting('app.current_retention_job', true) = 'true'
    OR public.customization_root(NULL, true)
  );
