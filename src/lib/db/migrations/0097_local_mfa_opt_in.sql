-- Local-scoped MFA opt-in. Default off so first Hub sessions are not blocked
-- by authenticator setup. Host operators (platform/union/division admin) stay
-- on hosted MFA independently of this flag.
ALTER TABLE locals ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT false;
