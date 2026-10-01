# MFA release evidence checklist

Use this checklist before describing the repaired MFA flow as restored on a hosted Officer Hub. Source tests prove the implementation contract in this checkout; they do not attest the running image, PostgreSQL grants/policies, replica configuration, encrypted data, or deployment state.

## Source state in this checkout

- [x] Findings F1–F10 addressed in commits `9d900778` through `2137d5b7`.
- [x] Challenge/setup UX and accessibility slice committed as `cf8019c6`.
- [x] Lost-phone recovery-code replacement committed as `1c950f8e`.
- [x] Broad MFA unit suite passed: 26 files, 161 tests.
- [x] TypeScript and targeted ESLint passed for the changed MFA surface.
- [x] Full unit suite passed: 528 files; 3,197 passed, 2 skipped, 1 todo. The two CPU-heavy XLSX serialization tests now have explicit 15-second budgets, consistent with existing PDF export tests, and pass under full-suite load.
- [x] Attempt `npm run test:smoke`: it planned 411 cases, then was stopped after multiple unrelated Brand Kit/builders cases showed public-page 404s. This run does not establish MFA browser coverage.
- [x] Attempted the MFA enrollment browser spec against an isolated port. Default Turbopack stopped with an `invalid node_modules symlink outside filesystem root` panic. Webpack dev started, but the login route returned 500 because `src/lib/comms/canvas-fonts.ts` imports `node:fs/promises` through the Brand Kit seed path; Playwright therefore could not reach MFA. This is a local app/toolchain blocker, not an MFA pass.
- [x] Built the current production image and ran `scripts/docker-migrate-smoke.sh` against its unique disposable Compose project. Fresh deploy and historical journal-hole repair verified through `0092_mfa_reenroll_grace`; concurrent no-op deploys serialized; removing a required column caused startup to fail closed. The script cleaned up its container and volume.
- [x] Started a separate unique disposable Postgres project, applied migrations, seeded its demo fixtures, and ran `npm run db:rls-smoke` using the limited `unionops_app` role plus an independent owner observer. The smoke passed account-scoped MFA RLS and directly verified persisted encrypted pending enrollment, an attempt counter, a hashed grant, and its consumed state. The role check confirmed no `BYPASSRLS`. See [`session-knowledge-2026-09-30-mfa-local-release-evidence.md`](session-knowledge-2026-09-30-mfa-local-release-evidence.md).
- [x] The live MFA binder smoke raced five attempt reservations and two uses of one grant. Postgres retained the full attempt count and exactly one grant consumer succeeded. This is single-process concurrency coverage, not multi-replica proof.
- [x] The live MFA binder smoke used a separate Node process to read the pending secret and consume a grant created by the first process. A subsequent consume in the original process was rejected. This verifies durable process handoff locally, not the deployed replica/restart sequence.
- [x] Ran `npm run db:mfa-restore-smoke` against a disposable migrated database with an explicit throwaway key. The encrypted TOTP survived `pg_dump`/`pg_restore` and verified; missing/wrong-key decryptions failed and the stored ciphertext stayed unchanged. This does not verify the hosted backup's preserved key or actual recovery procedure.
- [x] With `unionops_app` table privileges temporarily revoked on a disposable database, pending write/clear, attempt reservation, grant issue/consume, and recovery-code rotation fault checks passed. Durable operations failed closed; transaction state stayed unchanged. The exercise surfaced F11: raw driver messages included bound values. MFA logs now record only error type and safe SQLSTATE; focused redaction tests pass.
- [x] The expanded fault smoke was rerun after log redaction. Its emitted MFA failures contained only account ID, error type, and SQLSTATE `42501`; no SQL statement or bound values appeared.
- [ ] Manual keyboard, mobile, zoom, and EN/FR language review.
- [x] Local typed TOTP plus Enter during pending confirmation and filled-code variants passed independently with fresh demo fixtures, exactly one confirmation request each. Continue waits for session verification before selecting the destination. This does not attest OS autofill, clipboard paste, or hosted/privileged accounts.
- [x] Local production-image Chromium enrollment passed after correcting the manual-key selector and fixing the F5 session-refresh redirect. The test checks the exact auto-submitted code, final HTTP 200, recovery-code acknowledgment, and return to Hub. This uses a disposable memory/demo account, not hosted Postgres or privileged-route acceptance. See the 2026-10-01 follow-up in the local evidence note.

Local disposable Postgres evidence is now available. The RLS smoke uses an independent owner connection to assert durable attempt/grant state, so memory fallback cannot make those binder checks pass. It also exercises concurrent operations in one process. This does not attest hosted image identity/configuration, cross-replica behavior, production-key recovery, hosted concurrency/fault injection, or browser journeys. Continue with the hosted checks below.

## Operator-owned hosted proof

Run in a production-like, disposable environment with a dedicated fixture account and real `unionops_app` runtime credentials. Do not run the state-mutating account/binder checks against production member accounts. Preserve the configured TOTP encryption key and do not paste secret values into evidence or logs.

### Image and runtime configuration

- [ ] Record deployed image digest and source commit. Confirm they contain commits `9d900778`, `fb754d3f`, `c6a7a593`, `ac8c36c5`, `3dfce24d`, `2137d5b7`, `cf8019c6`, and `1c950f8e` (or a descendant containing them).
- [ ] Confirm `AUTH_USERS_BACKEND=postgres`, `AUTH_MFA_MODE=totp`, hosted MFA is enabled, and each replica has consistent `AUTH_SECRET` and `AUTH_TOTP_ENCRYPTION_KEY`. Record presence and consistency only, never values.
- [ ] Confirm `DATABASE_URL` uses the limited `unionops_app` role and `MIGRATE_DATABASE_URL` is reserved for the verified migration gate. Check `/api/health` reports verified database deployment and the exact expected journal tail/shape.
- [ ] Verify the runtime role is not superuser and has no `BYPASSRLS`; verify RLS and the required named policies cover MFA pending enrollments, TOTP counters, recovery codes, attempts, and grants.

### Replica, concurrency, and fault evidence

- [ ] Start setup on replica A, confirm the QR on replica B, consume the returned handoff grant on A, restart a replica, and verify using the persisted authenticator again.
- [ ] Using isolated fixture accounts, race duplicate TOTP and recovery-code verification, duplicate pending enrollment confirmation, QR regeneration, code rotation, and grant consumption. Confirm each one-time factor/grant succeeds at most once and only the active recovery-code set is returned.
- [ ] Fault-inject recovery-code rotation, pending enrollment write/clear, MFA grant issue/consume, and browser session refresh. Confirm durable transactions roll back together, one-time plaintext is not lost or replayed, and the UI gives a recoverable status with no false success.
- [ ] Exercise account reset and re-enrollment grace with a protected deep destination. Confirm setup is reachable but protected modules remain closed until a verified session is established.
- [ ] In a disposable restored backup, verify TOTP decryption with the preserved key; separately verify missing/wrong-key behavior fails closed without replacing stored secrets.

### Browser and release review

- [ ] Run MFA browser flows against the production-like host: typed, pasted, and autofilled TOTP with no rescue click; Enter/auto-submit races; recovery sign-in and lost-phone replacement; one-time recovery-code reuse; recovery-code rotation followed by protected navigation; status 503/retry; reset-grace deep return.
- [ ] Review EN and FR with a fluent reviewer and test keyboard-only navigation, visible focus/error announcements, narrow mobile, and 200% zoom.
- [ ] Record migration tail, RLS/grant results, replica/build identifiers, test timestamps/results, restore evidence, and rollback image. Follow ADR-020: deploy the CI-built GHCR image through CapRover Method 3; recover forward or restore a tested backup rather than editing migration history or relying on an on-droplet build.

## Evidence record

| Evidence | Result / reference | Date / reviewer |
|---|---|---|
| Deployed image digest + source commit | Pending | — |
| Local disposable DB tail + shape + role/RLS | Passed: `0092_mfa_reenroll_grace`; `unionops_app` has no `BYPASSRLS`; independent owner queries verified MFA persistence. See session note. | 2026-09-30 / Codex |
| Hosted DB tail + shape + role/RLS | Pending | — |
| Local concurrency smoke | Passed: five parallel attempt reservations persisted; two parallel consumers of one hashed grant yielded exactly one success. | 2026-09-30 / Codex |
| Local second-process handoff | Passed: fresh process read pending TOTP state and consumed the grant; original process could not consume it again. | 2026-09-30 / Codex |
| Local durable-store fault injection | Passed: privilege-denied MFA write/clear paths failed closed and recovery rotation rolled back; logs contained error type/SQLSTATE without driver parameters. | 2026-09-30 / Codex |
| MFA failure-log redaction | Passed: unit coverage plus live revoked-privilege errors emitted only safe structured metadata. | 2026-09-30 / Codex |
| Replica and restart sequence | Pending | — |
| Hosted concurrency and fault injection | Pending | — |
| Local throwaway-key encryption restore | Passed: ciphertext restored and verified; missing/wrong-key paths failed without mutation. | 2026-09-30 / Codex |
| Hosted encryption-key restore drill | Pending | — |
| MFA browser + EN/FR/accessibility review | Pending | — |
| Local demo enrollment browser journey | Passed on rebuilt production image: auto-submit through saved-code acknowledgment and Hub return; F5 Auth.js transition regression fixed. Hosted and broader browser coverage remain open. | 2026-10-01 / Codex |
| Rollback image / restore reference | Pending | — |

This checklist is a release gate, not proof that the hosted deployment has passed it. Keep the corresponding ledger row open until the operator evidence is attached.
