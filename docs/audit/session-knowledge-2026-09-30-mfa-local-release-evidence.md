# MFA local release evidence — 2026-09-30

This checkout now has disposable local Postgres evidence for Phase 5B. It does not establish that any hosted UnionOps deployment is restored.

## What passed

- `scripts/docker-migrate-smoke.sh` built the current production image and passed on an isolated Compose project. Fresh migration and schema verification reached `0092_mfa_reenroll_grace`; journal-hole repair passed; concurrent no-op deploys serialized; the image refused to start after a required column was removed. Its trap removed the temporary project and volume.
- A separate unique Compose project was migrated through `0092_mfa_reenroll_grace`, seeded, and checked with `npm run db:rls-smoke` over the `unionops_app` runtime role. The role lacked `BYPASSRLS`. Account-scoped MFA RLS checks passed. An independent owner connection verified the app binders left encrypted pending-enrollment state, an attempt row, a SHA-256 grant digest, and a consumed grant in Postgres. The temporary project and volume were removed.
- The MFA binder smoke reserved five attempts concurrently and confirmed all five were durably counted. Two parallel consumers of the same grant produced exactly one success, with the consumed timestamp visible to the independent owner observer. This validates local database race behavior, not cross-replica operation.
- The same smoke launched a fresh Node process to read the pending TOTP and consume a grant created by the first process. The original process could not consume the grant again. The test now closes both runtime and owner Postgres clients so its disposable project exits cleanly.
- `npm run db:mfa-restore-smoke` passed against a migrated disposable database with an explicit throwaway encryption key. An encrypted TOTP secret survived `pg_dump`/`pg_restore` and verified a generated code. Missing-key and wrong-key decryptions failed, and the restored ciphertext remained unchanged. The temporary project and volume were removed.
- Permission-revocation checks against a disposable database covered pending enrollment write/clear, attempt reservation, grant issue/consume, and recovery-code rotation. All durable operations failed closed; recovery rotation left active-code count and session version unchanged. These checks exposed F11: database driver errors logged bound query values, including encrypted TOTP ciphertext. All MFA failure log sites now emit only error type and a validated SQLSTATE; unit tests and captured live fault logs confirm driver messages and parameters are omitted.

No database URL or PostgreSQL client was required from the host. Docker Compose and a local `postgres:16-alpine` image were available when the command ran with elevated Docker access. The migration smoke built `union-communications:ci` from the current checkout.

## Limits and continuation

The MFA app-binder smoke checks durable rows independently, so a successful memory fallback cannot satisfy those assertions. It covers a fresh process handoff and concurrent attempt/grant operations against local Postgres. Hosted replica A/B/restart proof, broader races, and fault injection remain open.

Continue Phase 5B with hosted image/configuration evidence, replica A/B/restart handoff, multi-replica concurrency and fault injection, an encrypted TOTP backup restore with the production key and verified recovery procedure, browser typed/paste/autofill and recovery journeys, EN/FR/accessibility review, and a rollback image/restore reference. Keep the hosted checklist items open until those artifacts exist.

Do not record secret values in evidence. The demo seed logs a generated platform-admin bootstrap password; keep those logs out of shared evidence and tear down disposable databases after the run.
