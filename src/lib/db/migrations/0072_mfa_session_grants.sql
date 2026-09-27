-- Durable one-use session-update grant state. Keep one row per account so
-- expired grants do not grow without bound; only the token hash is persisted.
CREATE TABLE mfa_session_grants (
  user_id text PRIMARY KEY NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL CHECK (length(token_hash) = 64),
  session_version integer NOT NULL CHECK (session_version >= 0),
  issued_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  CHECK (expires_at > issued_at)
);
--> statement-breakpoint
ALTER TABLE mfa_session_grants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE mfa_session_grants FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mfa_session_grants_user_select ON mfa_session_grants
  FOR SELECT
  USING (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE POLICY mfa_session_grants_user_insert ON mfa_session_grants
  FOR INSERT
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
CREATE POLICY mfa_session_grants_user_update ON mfa_session_grants
  FOR UPDATE
  USING (user_id = nullif(current_setting('app.current_user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
REVOKE DELETE ON mfa_session_grants FROM unionops_app;
