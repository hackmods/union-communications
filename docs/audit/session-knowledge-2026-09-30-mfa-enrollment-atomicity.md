# MFA Enrollment Confirmation Atomicity — 2026-09-30

## Contract

Enrollment confirmation now serializes on the account and locks the pending enrollment row. In Postgres mode, the confirmed encrypted secret, `mfa_enabled`, session-version bump, seeded replay counter, recovery-code replacement, pending-secret placeholder, one-time grant, and success audit all run inside the same outer RLS transaction. A transaction failure rolls the workflow back instead of returning a failed response after partially committing the authenticator.

The recovery rotation helper accepts an internal option to skip its usual session-version bump when confirmation already bumped it. Duplicate or expired confirmations return `409 no_pending`; they do not rotate recovery codes again. Setup keeps the returned plaintext recovery codes in component state before calling `session.update()`. If the grant handoff fails, it still shows the saved-code acknowledgement and directs the officer to a fresh challenge. A `no_pending` response also links directly to the challenge while preserving the return destination.

## Validation and remaining evidence

Focused route/store tests passed (4 files / 42 tests), TypeScript passed, and targeted ESLint passed. The duplicate-confirm test asserts exactly one successful response and ten active recovery codes. Actual `unionops_app` transaction/RLS testing, fault-injected database rollback, and browser verification that a failed `session.update()` still leaves the one-time codes visible remain release evidence for Phase 5.
