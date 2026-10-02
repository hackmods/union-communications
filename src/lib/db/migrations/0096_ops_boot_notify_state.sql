-- Singleton ops lifecycle notify state (deploy / restart operator emails).
-- Platform-wide — not tenant casework. No RLS; retentionJob / cron use GRANT.

CREATE TABLE IF NOT EXISTS ops_boot_notify_state (
  id boolean PRIMARY KEY DEFAULT TRUE CHECK (id),
  last_deploy_commit text,
  last_deploy_notified_at timestamp with time zone,
  last_restart_notified_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
REVOKE ALL ON ops_boot_notify_state FROM unionops_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON ops_boot_notify_state TO unionops_app;
