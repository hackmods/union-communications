# Session knowledge — 2026-09-30 — durable MFA pending enrollment

**Scope:** Packet 6 leftover. After grants, replay counters, recovery codes,
and attempt limits moved to Postgres, first-time TOTP enrollment still failed
on multi-replica hosts and then rejected the same authenticator code on the
follow-up verify step.

## What broke

- `POST /api/mfa/enroll` stashed the QR secret in a process-local `Map`.
  Confirm on another CapRover replica returned `400 No pending enrollment`.
- Confirm seeded `mfa_totp_counters` with the just-accepted counter, then the
  setup page sent the account holder to `/app/mfa` to enter a second code.
  The authenticator still showed the same 30-second value, so verify failed
  as replay. Unit tests had encoded that 400 as expected.

## Contract

- Migration `0090_mfa_pending_enrollments.sql` stores one pending secret per
  account with a 10-minute expiry. `unionops_app` may SELECT/INSERT/UPDATE;
  DELETE is revoked. RLS is `FORCE`d on `app.current_user_id`. Clearing a
  pending row updates it to an expired placeholder (no DELETE).
- Hosted customer mode fails closed without `AUTH_USERS_BACKEND=postgres` and
  a configured `DATABASE_URL`. Demo/local keep the in-memory map.
- Confirm persists the secret, rotates recovery codes, then issues an MFA
  grant stamped with the **post-bump** `users.session_version`. The setup
  page consumes that grant through `session.update({ mfaGrant })`. The
  account holder saves recovery codes and continues; they do not re-enter
  the same TOTP. Replay still rejects that counter on later verify/step-up.
- Persist/rotate failures return `503` with a storage-unavailable message
  instead of an uncaught 500. A grant-issue failure after a successful
  persist still returns recovery codes so the account is not left thinking
  confirm failed.

## Files

- Store: `src/lib/auth/mfa-enrollment-store.ts`
- Routes: `src/app/api/mfa/enroll/route.ts`, `src/app/api/mfa/enroll/confirm/route.ts`
- Setup UI: `src/app/[locale]/app/mfa/setup/MfaSetupPageClient.tsx`
- Migration / schema / RLS: `0090_mfa_pending_enrollments.sql`,
  `src/lib/db/schema/auth.ts`, `src/lib/db/rls-contract.ts`
- Checks: `src/lib/auth/mfa-routes.test.ts`,
  `src/lib/auth/mfa-enrollment-store.test.ts`, `scripts/rls-smoke.ts`,
  `e2e/mfa.enroll-totp.spec.ts` (skips unless host TOTP is on)

## Limits

- TOTP secrets remain plaintext on `users.totp_secret` and on the pending
  row (the QR response already returns the secret for manual entry).
  Follow-up 2026-09-30: application-level AES-256-GCM when
  `AUTH_TOTP_ENCRYPTION_KEY` is set; see
  [`session-knowledge-2026-09-30-mfa-totp-encryption.md`](session-knowledge-2026-09-30-mfa-totp-encryption.md).
- Deployed `unionops_app` RLS and live multi-replica evidence still need a
  host run of `db:rls-smoke` / `ops:verify-durable`.
