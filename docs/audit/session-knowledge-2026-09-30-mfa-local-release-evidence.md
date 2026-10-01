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

### 2026-10-01 browser follow-up

- Docker API access succeeds with elevated execution; the earlier sandbox permission denial did not establish that Docker was unavailable. The disposable container and runner clocks matched.
- The enrollment test's broad “Can't scan” locator could click the help panel before QR generation finished. Its hidden manual-key paragraph had text content but empty `innerText`, yielding an invalid TOTP. Scope the disclosure to the manual-key paragraph and assert visibility plus a nonempty key. The server-clock workaround from `f53f0cf6` was removed after disproving that diagnosis.
- After correcting the test, the old production image accepted the exact auto-submitted code with HTTP 200 but redirected away from recovery codes. Auth.js `update()` transitions through loading/authenticated; the setup status effect reran, discovered enrollment, and redirected. The F5 follow-up records confirmation before refreshing the session and preserves the completed screen through that transition.
- Built `union-communications:mfa-recovery-check`, image ID `sha256:03ea964b167cbe42256851b45d274b1ceea88d610d0728848fc486ea9290e950`. Its Chromium enrollment E2E passed in 3.6 seconds: visible manual key, exact six-digit auto-submit, HTTP 200, recovery codes, saved-code acknowledgment, and return to `/en/app/`. The temporary app container was stopped. This used an isolated demo memory account with direct `node server.js` startup on port 3100; it does not prove hosted database/replica behavior or a privileged account's protected navigation.
- Focused tests: 91 tests across eight files passed (the October catalog assertion was updated and its seven tests rerun). TypeScript, changed-file ESLint, and production image build passed. Full-project lint was attempted and failed with six pre-existing errors in `e2e/officer-learning.quiz.audit.spec.ts` and `scripts/mock-server-only.cjs`, plus warnings in unchanged files. No push or deployment was performed.
- Resume with real-account Postgres browser flows, typed/paste/autofill and Enter races, recovery replacement/rotation, reset/deep-return, status retry, and EN/FR/accessibility. Do not repeat the resolved clock investigation or count this demo journey as hosted release acceptance.

The MFA app-binder smoke checks durable rows independently, so a successful memory fallback cannot satisfy those assertions. It covers a fresh process handoff and concurrent attempt/grant operations against local Postgres. Hosted replica A/B/restart proof, broader races, and fault injection remain open.

Continue Phase 5B with hosted image/configuration evidence, replica A/B/restart handoff, multi-replica concurrency and fault injection, an encrypted TOTP backup restore with the production key and verified recovery procedure, browser typed/paste/autofill and recovery journeys, EN/FR/accessibility review, and a rollback image/restore reference. Keep the hosted checklist items open until those artifacts exist.

Do not record secret values in evidence. The demo seed logs a generated platform-admin bootstrap password; keep those logs out of shared evidence and tear down disposable databases after the run.
