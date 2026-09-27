# Session knowledge — 2026-09-27 — TOTP replay guard

**Scope:** Packet 6 security slice; reject reuse of an accepted RFC 6238
counter across MFA verification requests and app replicas.

## Behavior and storage

- `matchTotpCounter()` in `src/lib/auth/totp.ts` returns the exact counter
  matching within the configured current ±1 step clock-skew window. The
  existing boolean `verifyTotp()` delegates to it.
- `verifyMfaCode()` consumes a matched counter before returning success. A
  duplicate or older accepted counter returns the ordinary invalid-code
  response; it does not disclose the prior successful attempt.
- Migration `0071_mfa_totp_replay_guard.sql` creates one account-owned row in
  `mfa_totp_counters`, containing only `user_id` and `last_counter`. An atomic
  `INSERT ... ON CONFLICT DO UPDATE ... WHERE last_counter < excluded...`
  permits one request to advance the account state. PostgreSQL serializes
  concurrent conflicts, so a second replica cannot also consume that counter.
- The table has `ENABLE` and `FORCE ROW LEVEL SECURITY` with policy scope on
  `app.current_user_id`. Runtime queries execute through `withRlsContext()`.
  The app role has no DELETE privilege, so runtime code cannot clear its own
  counter to make an already-used code valid again.
  The current counter is state, not a retained authentication-event log; it is
  removed with its user row through the account foreign key.
- Hosted customer mode refuses the in-memory fallback. It requires both
  `AUTH_USERS_BACKEND=postgres` and a configured `DATABASE_URL` for counter
  consumption.
- Confirming a new TOTP secret records the confirmation code's counter in the
  same Postgres transaction as secret persistence. This prevents using the
  same setup code again immediately. A new secret resets the counter state to
  the counter just used for confirmation.
- The `db:rls-smoke` addition creates and tests a counter row inside a
  transaction that is intentionally rolled back, so it does not modify seeded
  account replay state. It checks owner visibility, owner-delete denial, and
  cross-account read/write denial.

## Files and tests

- Service: `src/lib/auth/mfa-totp-counters.ts`
- Drizzle table: `src/lib/db/schema/auth.ts`
- Migration: `src/lib/db/migrations/0071_mfa_totp_replay_guard.sql`
- Contract entries: `src/lib/db/rls-contract.ts`,
  `docker/db-required-shape.json`
- Tests: `src/lib/auth/mfa-totp-replay.test.ts`,
  `src/lib/db/rls-contract.test.ts`; live boundary scenario in
  `scripts/rls-smoke.ts`

## Limits and verification

- A matched future-window counter advances state; a subsequently submitted
  lower counter is rejected. Operators need synchronized system clocks.
- Failed-code rate limiting is still separate work. At the time this replay
  slice was first recorded, MFA grant nonces and pending enrollment were
  process-memory-backed. The follow-up grant slice now stores hashed one-use
  grants durably in migration `0068`; pending enrollment remains
  process-memory-backed. See
  [`session-knowledge-2026-09-27-mfa-grants.md`](session-knowledge-2026-09-27-mfa-grants.md).
- Existing TOTP secrets are not encrypted by this change. Key management and
  rotation require separate design and deployment evidence.
- Source tests were added, but this checkout has no `node_modules` and no live
  database. Vitest, typecheck, lint, generated shape contract, deployed
  migration, and `unionops_app` RLS smoke remain unverified.

## Lesson

A one-use follow-on grant does not make its authenticator proof one-use. Replay
state must be consumed where every TOTP proof is validated, including account
verification and sensitive operator step-up. Keep the verifier's matched
counter and durable consume in the same shared service, then seed that state
when enrollment itself verifies the first code.
