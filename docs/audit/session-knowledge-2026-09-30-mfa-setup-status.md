# MFA Setup Submission and Status Errors — 2026-09-30

## Contract

TOTP auto-submit passes the completed digit string directly to `confirmWithCode`; it no longer submits a form that reads a stale React state value. The setup component integration test types the sixth digit and asserts the exact value sent to `/api/mfa/enroll/confirm`.

Both MFA challenge and setup pages distinguish initial loading from unavailable status and expired authentication. A status outage never implies that an authenticator is absent or that setup should proceed. `/api/mfa/status` returns a stable `status_unavailable` code with an `X-Request-ID` and response `requestId` when status or session lookup fails. EN/FR screens show a retry action and the safe support reference; HTTP 401 provides a sign-in action.

## Validation and remaining evidence

Focused Vitest: 3 files / 28 tests passed; TypeScript and targeted ESLint passed. Browser-level typed/pasted/autofilled coverage and production outage behavior remain open in Phase 5 of `mfa-review-2026-09-30.md`.
