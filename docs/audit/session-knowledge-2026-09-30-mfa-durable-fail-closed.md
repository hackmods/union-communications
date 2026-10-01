# Session knowledge — 2026-09-30 — durable MFA errors fail closed

## Contract

- `AUTH_USERS_BACKEND=postgres` selects PostgreSQL as the authority for MFA
  attempts, pending enrollment, session grants, replay counters, and recovery
  codes. A failed database write/read must not be acknowledged from a
  process-local map, even outside hosted customer mode; another request may
  reach a different replica or a recovered database.
- Process memory remains the normal implementation only when the memory
  backend is selected (demo/development). Hosted customer mode still refuses
  memory configuration before beginning protected MFA flows.
- Recovery-code rotation returns plaintext only after the selected Postgres
  transaction succeeds. If that write fails, report an unavailable operation;
  do not return codes that the verification path cannot read.
- A successful Postgres read with no active pending enrollment is
  authoritative. Clear local mirrors and return no pending code; never
  resurrect a process-local enrollment after a durable miss/clear.
- The existing process-local health signal records a recent durable-store
  failure before fail-closed return. Readiness copy calls out storage errors
  and fallbacks so operators know to inspect Postgres grants and logs.

## Scope and evidence

Phase 1 of [`mfa-review-2026-09-30.md`](mfa-review-2026-09-30.md) changes
`mfa-attempt-limits`, `mfa-enrollment-store`, `mfa-grants`,
`mfa-totp-counters`, and recovery-code rotation. Focused fault-injection tests
cover attempts, pending enrollment, grant issue/consume, TOTP replay state,
and recovery-code rotation. Five test files / 24 tests passed, and
`tsc --noEmit` passed in the checkout.

These are source-level tests. The configured test mocks do not prove live
`unionops_app` grants, RLS, cross-replica behavior, or CapRover state. Run the
current `db:rls-smoke` and multi-replica checks against isolated test accounts
in Phase 5. Health field names retain the existing `mfaDurableFallbackRecent`
API for compatibility, though the signal now also records prevented
fallbacks where the durable store failed.

## Follow-up

Continue with Phase 2 in the review plan. Recheck health/readiness contract if
the compatibility field is renamed; update both locales together. Do not
restore transparent memory fallback on selected Postgres paths as an
availability fix.
