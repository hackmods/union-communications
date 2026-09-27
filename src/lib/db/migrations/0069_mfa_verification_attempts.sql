-- Limit repeated MFA challenges with shared per-account state across replicas.
CREATE TABLE mfa_verification_attempts (
  user_id text PRIMARY KEY NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  window_started_at timestamp with time zone NOT NULL,
  attempt_count integer NOT NULL
    CHECK (attempt_count BETWEEN 1 AND 10)
);
--> statement-breakpoint
ALTER TABLE mfa_verification_attempts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE mfa_verification_attempts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mfa_verification_attempts_user_select ON mfa_verification_attempts
  FOR SELECT
  USING (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE POLICY mfa_verification_attempts_user_insert ON mfa_verification_attempts
  FOR INSERT
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE POLICY mfa_verification_attempts_user_update ON mfa_verification_attempts
  FOR UPDATE
  USING (user_id = nullif(current_setting('app.current_user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
REVOKE DELETE ON mfa_verification_attempts FROM unionops_app;
