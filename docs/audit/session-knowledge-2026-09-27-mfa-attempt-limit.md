# Session knowledge — 2026-09-27 — MFA verification attempt limit

## Control

- Shared MFA verification reserves up to 10 attempts per account in a fixed
  15-minute window beginning with that account's first attempt. Successful
  challenges count toward the cap too; this bounds
  online guessing and repeated recovery-code submissions without storing the
  submitted code or IP address.
- Migration `0073_mfa_verification_attempts.sql` stores one current window row
  per account. Hosted customer mode requires Postgres-backed account storage;
  the upsert is conditional and atomic so replicas share the same limit.
- The table is account-scoped with `ENABLE` and `FORCE ROW LEVEL SECURITY`.
  Runtime can select/insert/update only its current user's row and cannot
  delete it. An expired window resets during the next attempt. The row is
  current state, not an attempt history, and is removed with account deletion.
- `verifyMfaCode()` applies the limit to normal TOTP/shared-code challenges,
  recovery-code rotation, and action-bound incident challenges. The MFA verify
  API reserves once before trying a recovery code, so one submission consumes
  one slot. A throttled response includes `Retry-After` and is not cached.
- Non-hosted development/evaluation keeps a process-local implementation; it
  does not provide cross-process protection. Hosted mode fails closed if
  durable storage is missing or unavailable.

## Files and checks

- Service and shared verifier: `src/lib/auth/mfa-attempt-limits.ts`,
  `src/lib/auth/mfa-policy.ts`
- Routes: `src/app/api/mfa/verify/route.ts`,
  `src/app/api/mfa/recovery-codes/route.ts`; incident step-up uses the shared
  verifier as well.
- Schema/migration: `src/lib/db/schema/auth.ts`,
  `src/lib/db/migrations/0073_mfa_verification_attempts.sql`
- Account RLS contract and rolled-back live smoke: `src/lib/db/rls-contract.ts`,
  `scripts/rls-smoke.ts`
- Tests: `src/lib/auth/mfa-attempt-limits.test.ts`,
  `src/lib/auth/mfa-routes.test.ts`

The source includes fixed-window and per-account tests plus route-level
throttling coverage. The local static pass checked TypeScript syntax for 82
files, the 70-entry migration journal, the 132-table required shape (unique
table/policy rows), the npm audit policy harness (four checks), and
`git diff --check`. Vitest, typecheck, the official Drizzle shape generator,
and live Postgres/RLS behavior could not be run because dependencies and a
database are unavailable in this checkout. Validate concurrent attempts
through `unionops_app` on staging before relying on this control in production.

## Limits

- Ten attempts per 15 minutes is an internal engineering default, not a legal
  requirement. Security/product owners should review usability and tune it only
  with staged evidence.
- The counter includes successful challenges; a user can hit the cap through
  repeated normal reauthentication and must wait for the window reset.
- This does not add distributed IP throttling, anomaly alerts, or a retained
  attempt-by-attempt audit trail. Do not log MFA codes, recovery codes, or raw
  addresses in future monitoring.
