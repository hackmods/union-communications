-- 24h Hub access after MFA reset so operators are not locked out while re-enrolling.
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_reenroll_grace_until timestamp with time zone;
