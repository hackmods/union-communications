# Session knowledge — MFA lockout postmortem (2026-09-30)

## What failed

Site Admin reset cleared TOTP → Hub hard-gated to setup → enroll/verify hit durable MFA stores that failed closed (`storage_unavailable` / 503). Operators were locked out of their own Hub.

## Root causes CI missed

1. **Date bind** — `reserveMfaVerificationAttempt` interpolated bare `Date` into Drizzle `sql\`...\``; Postgres rejected `Wed Sep 30 … GMT`. Unit tests only hit the memory path.
2. **Missing GRANTs** — MFA tables created after `0008` relied on DEFAULT PRIVILEGES; some CapRover DBs lacked `INSERT/UPDATE` for `unionops_app` while DELETE was revoked. Boot shape checked tables/RLS/role non-bypass, not DML grants.
3. **RLS smoke used raw `now()`** — never called app binders (`reserveMfaVerificationAttempt`, pending enroll, grants).

## Fixes shipped in this cleanup

- Migration `0092` + `users.mfa_reenroll_grace_until` (24h Hub access after reset; banner; clears on enroll).
- Memory fallback + `noteMfaDurableFallback` on attempt/pending/grant/counter/recovery; health `mfaDurableFallbackRecent`; readiness advisory `mfaDurableStoreHealthy`.
- Verify: match → grant → consume (no burn on grant failure; burn grant on replay/recovery miss).
- Boot contract `tablePrivileges` for MFA tables; rls-smoke exercises app code; `toTimestamptzSqlParam` + unit guards.

## Ops notes

- Prefer grace after reset over `AUTH_MFA_OPERATOR_BYPASS_EMAILS` (break-glass only; clear after re-enroll).
- CapRover logs remain the SQL/detail channel (`userId` + message; never TOTP/key).
- CI with Postgres / nightly durable job must run `db:rls-smoke`; unit suite alone is insufficient for binder bugs.
