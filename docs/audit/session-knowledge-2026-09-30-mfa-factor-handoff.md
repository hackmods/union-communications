# MFA Factor and Grant Handoff — 2026-09-30

## Contract

`POST /api/mfa/verify` serializes verification by account. In Postgres mode it locks the account row inside an RLS-scoped transaction; nested MFA store writes share that transaction. A valid TOTP counter or recovery code is consumed before the session grant is issued, so grant creation failure rolls the factor write back. Memory mode uses a per-process queue and preserves the same single-process behavior.

Only one unconsumed, unexpired grant for the current session version may be pending per account. A new challenge checks for that grant before consuming its factor and returns `409 grant_pending` while the prior browser handoff is still outstanding. The grant upsert also rejects replacement if a concurrent mutation occurs after the precheck. EN/FR UI copy asks the officer to finish the other tab or window first.

## Validation and remaining evidence

Focused route, grant, replay-counter, and attempt-limit tests passed (4 files / 37 tests), and `tsc --noEmit` passed. Real `unionops_app` multi-replica locking, Postgres rollback on grant failure, and application-role RLS behavior remain required release evidence in Phase 5 of `mfa-review-2026-09-30.md`.

The flow has not yet changed enrollment confirmation, recovery-code rotation, or client-side preservation of the enrollment response. Those belong to Phase 2C / Phase 3.
