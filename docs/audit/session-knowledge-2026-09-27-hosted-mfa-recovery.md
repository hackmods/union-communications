# Session knowledge — 2026-09-27 — hosted MFA recovery codes

## What changed

- Added Postgres-backed `mfa_recovery_codes` rows for account recovery. Each
  record holds a SHA-256 hash and timestamps only; plaintext codes are generated
  with 80 random bits and returned to the user once.
- Enrollment displays ten codes after the authenticator has been verified.
  The MFA page shows the number of remaining codes and lets the account holder
  replace the set after entering a fresh TOTP code.
- Recovery-code verification updates `used_at` with a conditional
  `(user_id, code_hash, used_at IS NULL)` predicate, so concurrent requests
  cannot successfully reuse the same code.
- Code replacement marks every outstanding row used and inserts a new set in
  one transaction. The account row is locked first to serialize concurrent
  rotations. Replacing codes increments `users.session_version`; TOTP
  enrollment does as well.
- The account-security table is intentionally not union-scoped, but has a
  `current_user_id` RLS policy. All reads/writes run through `withRlsContext`
  using the authenticated account id; clients cannot select another account.
- Added migration `0064_mfa_recovery_codes.sql`, journal entry 64, and the
  generated boot-shape row. The table uses `FORCE ROW LEVEL SECURITY` with a
  `current_user_id` policy, and `db:rls-smoke` now tests same-account access
  plus cross-account read/write denial. No prior migration was modified.

## Decisions and limits

- Recovery codes are not reversible-encrypted; only their hashes are stored.
  Their 80-bit random input makes offline guessing impractical, subject to a
  future security review.
- Plaintext codes are never put in audit metadata. Audit actions identify
  successful code use and replacement only.
- Hosted customer mode rejects memory storage for recovery-code operations.
  Non-hosted/demo mode keeps an in-memory implementation for local testing.
- Fresh TOTP is the step-up proof for replacement. A policy for broader
  action-bound step-up is still needed for publication, exports, role changes,
  incident access, and MFA reset.
- TOTP secrets remain stored in the existing `users.totp_secret` field. This
  work does not claim application-level encryption or key management.
- At the time this recovery-code slice was recorded, pending TOTP enrollment
  secrets and single-use MFA grants were both process-memory-backed. Follow-up
  slices on 2026-09-27 added the durable TOTP replay guard (migration `0067`)
  and hashed, one-row-per-account MFA session grants (migration `0068`). Only
  pending TOTP enrollment remains process-memory-backed; deployed RLS and
  multi-replica evidence for the new tables is still required. See
  [`session-knowledge-2026-09-27-mfa-grants.md`](session-knowledge-2026-09-27-mfa-grants.md).
- Recovery-code history currently follows account deletion through a cascading
  foreign key. The final retention schedule remains subject to counsel and
  operator approval.

## Verification status

- Added focused tests for format/hash normalization, owner binding, one-time
  consumption, rotation invalidation, and the API verification/replacement
  paths.
- `node scripts/check-db-migrations.mjs` passes with 65 journal entries;
  `node scripts/check-npm-audit.test.mjs` passes all four policy checks;
  Node's type-stripping syntax checks, EN/FR JSON parsing, generated-shape row
  presence checks, and `git diff --check` pass.
- Full Vitest, typecheck, lint, Drizzle-generated shape verification, migration
  smoke, and hosted PostgreSQL tests could not be run in this checkout because
  `node_modules` is absent and package registry access is unavailable. The
  `db:check` script confirms migration history, then stops because `tsx` is
  missing; the focused Vitest run stops because `vitest` is missing.
- Before deploying, run `npm run db:check`, unit tests, RLS/durability tests,
  and a fresh/upgrade database smoke with the owner migration URL and restricted
  `unionops_app` runtime role.

## Follow-up

1. Move pending TOTP enrollment to durable, protected storage; the separate
   short-lived MFA session-grant follow-up is implemented in migration `0068`
   but still needs deployed RLS and multi-replica verification.
2. Shared MFA verification now has a durable 10-attempt/15-minute source limit
   in migration `0069`; verify staging concurrency/RLS and add operational
   anomaly alerts. See
   [`session-knowledge-2026-09-27-mfa-attempt-limit.md`](session-knowledge-2026-09-27-mfa-attempt-limit.md).
3. Review whether recovery-code hashes and used timestamps need their own
   retention period after account closure.
4. Complete route-by-route API/MFA coverage and verify all associated RLS
   contexts on the deployed hosted profile.
