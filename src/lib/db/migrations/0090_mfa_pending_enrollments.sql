-- Short-lived TOTP enrollment-in-progress secrets, shared across app replicas.
-- Confirmed secrets still live on users.totp_secret; this row is only the QR
-- pending state until /api/mfa/enroll/confirm persists it.
CREATE TABLE mfa_pending_enrollments (
  user_id text PRIMARY KEY NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  secret text NOT NULL CHECK (length(secret) >= 16),
  expires_at timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE mfa_pending_enrollments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE mfa_pending_enrollments FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mfa_pending_enrollments_user_select ON mfa_pending_enrollments
  FOR SELECT
  USING (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE POLICY mfa_pending_enrollments_user_insert ON mfa_pending_enrollments
  FOR INSERT
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE POLICY mfa_pending_enrollments_user_update ON mfa_pending_enrollments
  FOR UPDATE
  USING (user_id = nullif(current_setting('app.current_user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
REVOKE DELETE ON mfa_pending_enrollments FROM unionops_app;
