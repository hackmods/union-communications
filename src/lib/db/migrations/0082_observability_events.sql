-- Host operator observability events (Sentry-free primary store on Docker).
-- Not union casework: INSERT open to app role; SELECT gated by platform-admin GUC.
CREATE TABLE IF NOT EXISTS observability_events (
  id text PRIMARY KEY NOT NULL,
  ts timestamp with time zone NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('error', 'warn', 'info')),
  source text NOT NULL CHECK (source IN ('server', 'client', 'cron', 'edge')),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
  name text,
  stack text,
  digest text,
  route text,
  build text,
  signal text,
  request_id text,
  fingerprint text NOT NULL CHECK (length(fingerprint) BETWEEN 8 AND 64),
  meta jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS observability_events_ts_idx ON observability_events (ts DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS observability_events_fp_ts_idx ON observability_events (fingerprint, ts DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS observability_events_level_ts_idx ON observability_events (level, ts DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS observability_events_source_ts_idx ON observability_events (source, ts DESC);
--> statement-breakpoint
ALTER TABLE observability_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE observability_events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Any app connection may append (cron / API 500 / client ingest).
DROP POLICY IF EXISTS observability_events_insert ON observability_events;
--> statement-breakpoint
CREATE POLICY observability_events_insert ON observability_events
  FOR INSERT WITH CHECK (true);
--> statement-breakpoint
-- Reads reserved for platform-admin MFA session (customization_root).
DROP POLICY IF EXISTS observability_events_operator_read ON observability_events;
--> statement-breakpoint
CREATE POLICY observability_events_operator_read ON observability_events
  FOR SELECT USING (public.customization_root(NULL, true));
--> statement-breakpoint
REVOKE UPDATE, DELETE ON observability_events FROM unionops_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON observability_events TO unionops_app;
