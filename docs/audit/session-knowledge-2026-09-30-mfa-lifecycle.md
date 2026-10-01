# MFA Recovery Rotation, Throttling, and Replacement — 2026-09-30

## Contract

Recovery-code rotation now serializes on the account and runs fresh TOTP consumption, recovery hash replacement, session-version bump, post-rotation grant issuance, and success audit in the same RLS transaction. The API returns the grant with the one-time plaintext codes. The client keeps those codes visible, consumes the grant through `session.update()`, and refreshes MFA status; it clears stale verified state before session handoff and uses only the refreshed MFA status for the management panel.

Enrollment confirmation now reserves the shared per-account attempt budget before matching a pending TOTP. Exhaustion returns `429 limited` with `Retry-After`; a durable limit-store failure returns `503 attempt_store_unavailable`. Starting or regenerating a pending QR does not reset the budget.

Replacement reauthentication passes the just-completed code directly from the input callback, and a synchronous enrollment lock prevents Enter/auto-submit races. After the first old-app code is consumed, “Generate another QR” returns to the replacement proof step, clears the old value, and requires a new current code. The action is disabled while confirmation is in flight.

## Validation and remaining evidence

Focused Vitest: 4 files / 40 tests passed, including UI handoff/status refresh, factor grant tests, duplicate confirmation, enrollment attempt limit, and replacement-code regeneration. TypeScript and targeted ESLint passed. Actual `unionops_app` rollback behavior for rotation/grant failures, cross-replica limits, and full browser recovery remains open in Phase 5 of `mfa-review-2026-09-30.md`.
