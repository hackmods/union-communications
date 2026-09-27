# Session knowledge — 2026-09-27 — UnionOps Data publication step-up

## Implemented scope

- `POST /api/data/imports/[id]/publish` now verifies a fresh MFA challenge
  after `requireDataAccess(true)` and before it calls `publishImport`.
- Existing Data Workbench access checks remain authoritative: current session
  MFA, enabled module, active union/local, allowed writer role, Postgres backend,
  and RLS context are still required. Step-up does not replace those checks.
- Missing challenge returns `428 mfa_step_up_required`; invalid, throttled,
  and unavailable checks stop publication. The throttled response preserves
  `Retry-After`. The shared helper enforces hosted production TOTP and the
  existing attempt/replay controls.
- Publication denial and completion use a server-generated request ID and
  outcome audit row. Resource fields identify the import/publication and
  metadata records row counts or stable reasons, never the MFA code or member
  values. Responses use
  `Cache-Control: private, no-store`.
- The Data Workbench retains the selected import, shows its source filename in
  the challenge confirmation, and resubmits with the entered code. EN/FR copy
  covers verification, throttling, outage, and the case where publication
  completed but its audit record could not be confirmed.
- Existing bilingual hosted-MFA What's New copy now names accepted-row
  publication as a fresh-challenge action when MFA is enabled.

## Security and operational boundaries

- `publishImport` already locks the dataset revision and rechecks run state
  inside its RLS transaction, so concurrent or replayed requests cannot publish
  the same import twice. The new step-up runs before this transactional check.
- The publication transaction commits before the route appends its success
  audit event. If audit storage fails after publication, the route returns
  `503 publication_audit_unavailable` and tells the operator that publication
  completed. The UI must not blindly retry; reload the import and inspect the
  audit trail first. A transactional audit/outbox design remains open work.
- This change covers UnionOps Data accepted-row publication. It does not verify
  Managed Documents, legal-policy publication, other content-publishing APIs,
  exports, or deletion workflows. The merged Managed Documents implementation
  is still absent from this checkout.
- Do not enable UnionOps Data for real member-data use until the separate
  module prerequisites are met: private storage, malware scanning, retention
  operations, review-impact visibility, and host verification.

## Tests and verification

- Direct route tests cover missing-challenge denial before `publishImport`,
  throttled denial/`Retry-After`, successful request-ID audit correlation and
  code omission, and the explicit post-commit audit failure response.
- Dependency-free checks pass: Node syntax checks for the changed TypeScript
  routes/tests, EN/FR JSON parsing with 13,366 recursive keys in parity, the 71
  entry migration journal/file check, all four npm audit policy assertions, the
  security-workflow contract check, and `git diff --check`.
- Focused Vitest, TypeScript, ESLint, deployed Postgres/RLS, and production host
  verification remain unavailable in this worktree because `node_modules`,
  global test/type/lint commands, and an authorized database/host are absent.
