# Session knowledge — 2026-09-27 — durable MFA session grants

**Scope:** Packet 6 hosted MFA handoff between a successful server-side factor
check and Auth.js accepting a JWT session update.

## Grant contract

- Migration `0072_mfa_session_grants.sql` creates one row per account with a
  SHA-256 token digest, session version, issue/expiry timestamps, and consumed
  timestamp. The plaintext 256-bit base64url nonce is returned once to the
  authenticated client and is never stored.
- Issuing another challenge for the same account replaces the previous row.
  The table remains bounded at one record per account; it is current security
  state, not an audit/event history.
- Postgres consumption uses one `UPDATE ... RETURNING` matching the account,
  digest, and unconsumed state. The update marks a matching nonce consumed
  before checking expiry and session version, so expired or stale-version
  nonces cannot be retried. Only a matching, unexpired grant with the current
  version sets the JWT's `mfaVerified` claim.
- Hosted customer mode refuses process-memory grants and requires
  `AUTH_USERS_BACKEND=postgres` plus a configured Postgres connection. Outside
  that profile, the existing memory implementation remains available for
  evaluation and development.
- The table has `ENABLE` and `FORCE ROW LEVEL SECURITY` scoped to
  `app.current_user_id`; only SELECT, INSERT, and UPDATE policies exist, and
  `unionops_app` cannot delete grant state. User deletion cascades the current
  row.
- `POST /api/mfa/verify` returns 503 if durable grant creation fails. The TOTP
  counter has already been consumed at that point; the user must wait for the
  next authenticator counter to retry. Auth.js `jwt` awaits
  `applyTrustedSessionUpdate()`, which catches storage errors and never turns
  them into a verified MFA claim.

## Files and verification

- Service: `src/lib/auth/mfa-grants.ts`
- Session callback: `src/lib/auth/session-update.ts`, `src/auth.config.ts`
- Route: `src/app/api/mfa/verify/route.ts`
- Drizzle table: `src/lib/db/schema/auth.ts`
- Migration: `src/lib/db/migrations/0072_mfa_session_grants.sql`
- Contracts: `src/lib/db/rls-contract.ts`, `docker/db-required-shape.json`
- Checks: `src/auth.config.test.ts`, `src/lib/auth/mfa-routes.test.ts`,
  `src/lib/db/rls-contract.test.ts`, and a rolled-back test in
  `scripts/rls-smoke.ts`

The tests and RLS smoke were updated but could not execute here because
`node_modules` and a live Postgres host are unavailable. Static TypeScript
syntax checks, the 69-entry migration journal at the time this slice was
written, required-shape uniqueness, and `git diff --check` passed. Required
shape rows were updated manually; run the official Drizzle contract generator
before deployment and execute concurrent consume requests through
`unionops_app` on a staging database. The following MFA attempt-limit slice
added migration `0069`; current journal status is recorded in the launch
tracker.

## Remaining MFA limits

- Pending enrollment secrets still live in process memory and are unsuitable
  for multi-replica hosted enrollment until moved to an approved durable,
  protected store.
- TOTP secrets remain plaintext in the current database column. Encryption
  key management, rotation, and existing-secret migration need a separate
  design.
- The shared MFA verifier now applies the account attempt limit from migration
  `0069`; verify the deployed `unionops_app` RLS path and concurrency behavior
  before relying on it. Incident step-up retains its separate failed-challenge
  limit as well.
- The broader sensitive-action step-up matrix, route audit, and target-host
  RLS/replica evidence remain open.

## Lesson

The browser carries a one-time capability from verification to Auth.js; a
process-local map silently binds that handoff to whichever replica receives
both requests. Store the digest centrally and consume it atomically. Keep only
one current row per user so expiry does not create a separate cleanup burden,
and make store failures fail closed at both the API and JWT callback.
