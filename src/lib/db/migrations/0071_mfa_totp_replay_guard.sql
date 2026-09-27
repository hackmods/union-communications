-- Retain only the newest accepted TOTP counter for each account. This state
-- prevents a code accepted by one app replica from being replayed at another.
CREATE TABLE mfa_totp_counters (
  user_id text PRIMARY KEY NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  last_counter integer NOT NULL CHECK (last_counter >= 0)
);
--> statement-breakpoint
ALTER TABLE mfa_totp_counters ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE mfa_totp_counters FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mfa_totp_counters_user_select ON mfa_totp_counters
  FOR SELECT
  USING (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE POLICY mfa_totp_counters_user_insert ON mfa_totp_counters
  FOR INSERT
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE POLICY mfa_totp_counters_user_update ON mfa_totp_counters
  FOR UPDATE
  USING (user_id = nullif(current_setting('app.current_user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
REVOKE DELETE ON mfa_totp_counters FROM unionops_app;
