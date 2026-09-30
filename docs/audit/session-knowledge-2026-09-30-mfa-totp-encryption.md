# Session knowledge — 2026-09-30 — TOTP secret encryption, restore drill, authenticator icon

**Scope:** Follow-on to durable pending enrollment. Authenticator codes already
survived deploys when Postgres held the secret; backups still stored that
secret in plaintext, and the otpauth URI had no icon.

## Contract

- `AUTH_TOTP_ENCRYPTION_KEY` is a dedicated 32-byte host key (base64 or
  64-char hex), not `AUTH_SECRET`. Rotating session signing does not brick
  authenticators. Optional `AUTH_TOTP_ENCRYPTION_KEY_PREVIOUS` decrypts during
  rotation.
- Writes to `users.totp_secret` and `mfa_pending_enrollments.secret` use
  AES-256-GCM with the account id as AAD (`uov1.` prefix). Hosted customer
  mode and production Postgres fail closed without the key. Memory/demo keeps
  plaintext process overrides.
- Reads still accept legacy base32 so a restored pre-encryption backup keeps
  working. Ciphertext cannot be read without the host key — losing the key
  forces re-enrollment, even if Postgres restores cleanly.
- `npm run db:mfa-restore-smoke` encrypts a smoke user, `pg_dump`s,
  `pg_restore`s into a scratch database, decrypts, and verifies a live TOTP.
  `ops:verify-durable` runs it after RLS smoke.
- otpauth URIs include `image=` when `AUTH_URL` is HTTPS, pointing at
  `/assets/unionops/authenticator-icon.png`. HTTP origins omit it (most apps
  refuse). Codes do not depend on the icon.

## Files

- Crypto: `src/lib/auth/totp-secret-crypto.ts`
- Persist/read: `src/lib/auth/mfa-user-secret.ts`,
  `src/lib/auth/mfa-enrollment-store.ts`, `src/lib/auth/invite-postgres.ts`
- Icon: `src/lib/auth/mfa-enrollment.ts`,
  `public/assets/unionops/authenticator-icon.png`
- Drill: `scripts/mfa-restore-smoke.ts`

## Limits

- This is application-level encryption, not disk/CMEK. Backups of Postgres
  still contain ciphertext; protect the key as a secret.
- Authenticator apps that ignore `image=` still show “UnionOps” from the
  issuer label.
