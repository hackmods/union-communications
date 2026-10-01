# MFA release evidence checklist

Use this checklist before describing the repaired MFA flow as restored on a hosted Officer Hub. Source tests prove the implementation contract in this checkout; they do not attest the running image, PostgreSQL grants/policies, replica configuration, encrypted data, or deployment state.

## Source state in this checkout

- [x] Findings F1–F10 addressed in commits `9d900778` through `2137d5b7`.
- [x] Challenge/setup UX and accessibility slice committed as `cf8019c6`.
- [x] Lost-phone recovery-code replacement committed as `1c950f8e`.
- [x] Broad MFA unit suite passed: 26 files, 161 tests.
- [x] TypeScript and targeted ESLint passed for the changed MFA surface.
- [x] Attempt `npm run test:smoke`: it planned 411 cases, then was stopped after multiple unrelated Brand Kit/builders cases showed public-page 404s. This run does not establish MFA browser coverage.
- [x] Attempted the MFA enrollment browser spec against an isolated port. Default Turbopack stopped with an `invalid node_modules symlink outside filesystem root` panic. Webpack dev started, but the login route returned 500 because `src/lib/comms/canvas-fonts.ts` imports `node:fs/promises` through the Brand Kit seed path; Playwright therefore could not reach MFA. This is a local app/toolchain blocker, not an MFA pass.
- [ ] Manual keyboard, mobile, zoom, and EN/FR language review.

Local release-evidence prerequisites are unavailable in this checkout: neither database URL is configured, and Docker Desktop denies access to its Linux engine pipe. Continue with the operator-owned hosted checks below rather than treating a mock store as Postgres evidence.

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
| Verified DB tail + shape + role/RLS | Pending | — |
| Replica and restart sequence | Pending | — |
| Concurrency and fault injection | Pending | — |
| Encryption-key restore drill | Pending | — |
| MFA browser + EN/FR/accessibility review | Pending | — |
| Rollback image / restore reference | Pending | — |

This checklist is a release gate, not proof that the hosted deployment has passed it. Keep the corresponding ledger row open until the operator evidence is attached.
