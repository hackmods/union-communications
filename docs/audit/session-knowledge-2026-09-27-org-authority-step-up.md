# Session knowledge — 2026-09-27 — tenant authority-change step-up

## Implemented scope

- `POST /api/organization/officers`, `DELETE /api/organization/officers/[id]`,
  `POST /api/organization/delegations`, and
  `DELETE /api/organization/delegations/[id]` now run the shared fresh-MFA
  verifier after actor capability and tenant/local scope checks, and before
  opening the authority-change transaction.
- The shared verifier requires a code when MFA is enabled, applies the existing
  attempt limiter and TOTP replay protection, and fails closed in
  UnionOps-operated customer mode unless production TOTP is configured. A
  self-hosted/evaluation instance with MFA disabled retains its existing
  behavior.
- Missing challenges return `428 mfa_step_up_required`; invalid, limited, and
  unavailable challenges stop the create or revoke. Already-revoked records
  remain idempotent no-ops and do not consume a new challenge. The attempt limit preserves
  `Retry-After`.
- Each POST response uses a server-generated request ID and
  `Cache-Control: private, no-store`. Denied validation/challenge outcomes and
  successful grants write actor, union/local, action, resource, outcome, and
  correlation fields. Metadata contains stable reasons or the granted role or
  capability; it never contains the submitted MFA code or delegation reason.
- The localized `OrganizationManager` keeps the pending body in component state
  after a `428`, shows the person and office/capability affected, asks for a
  six-digit authenticator code, and resubmits the same change with the
  challenge. It clears the code after a failed attempt while retaining the
  pending action, and shows EN/FR messages for failed, throttled, and unavailable
  verification. Changing the selected local clears the pending action and code.
  This pending body is not persisted to storage.
- The `/updates` hosted-MFA note now mentions role changes, officer assignment,
  and delegation grants.

## Security and operational boundaries

- A fresh challenge is bound to the grant by verifying it in the same API
  request; no reusable cross-action step-up token is issued.
- The existing route authorization, local lookup, union membership, active
  target membership, expiry checks, RLS wrapper, and recipient session-version
  invalidation remain in place. The challenge is not a replacement for those
  checks.
- Managed Documents/legal-policy and other content publication, sensitive
  exports, account recovery, deletion, and other privileged routes still require
  explicit route review. Accepted-row publication in UnionOps Data has a
  separate step-up slice documented in
  [`session-knowledge-2026-09-27-data-publish-step-up.md`](session-knowledge-2026-09-27-data-publish-step-up.md).
- Audit append remains after the grant transaction. If the grant commits and
  audit storage then fails, the API may return an error after the authority was
  applied. The caller should inspect the audit trail and resource state; a
  transactionally coupled outbox remains open work.
- A server response error must not be interpreted as proof that a previously
  committed grant was rolled back. Do not blindly repeat the grant without
  checking its resulting state.

## Tests and verification

- Direct route tests assert that all four APIs stop at the MFA boundary before
  any write transaction when the code is missing. A throttling case verifies
  `Retry-After` and denial-before-write behavior.
- Success-path tests assert that all four mutations carry the server request ID
  into an outcome audit row and do not put the code in audit calls.
- Focused Vitest execution, TypeScript, ESLint, and live Postgres/RLS checks are
  not verified here because project dependencies and an authorized database are
  unavailable. Static syntax, locale, migration, policy, workflow, and diff
  checks are to be recorded in the packet tracker after running.
