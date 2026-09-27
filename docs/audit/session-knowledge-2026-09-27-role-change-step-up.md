# Session knowledge — 2026-09-27 — Site Admin role-change step-up

## Implemented scope

- `PATCH /api/site-admin/users/[id]/roles` requires a fresh MFA code whenever
  `resolveMfaMode()` reports an enabled mode. The hosted customer profile also
  fails closed unless the resolved mode is production TOTP.
- A request without a code returns `428 mfa_step_up_required` before
  `setUserRoles` runs. The existing account-support form then reveals a
  localized MFA field and resends the requested roles with the code. Invalid,
  rate-limited, and unavailable challenges stop the mutation. The shared MFA
  verifier consumes the account attempt window and TOTP replay counter.
- Because the role mutation and challenge occur in one server request, no
  separate step-up grant is issued. The server generates an `X-Request-ID`,
  replaces any client-supplied response value, and records denied, limited,
  unavailable, validation, business-rule, and successful outcomes. The code is
  not included in the audit metadata. Responses use `Cache-Control:
  private, no-store`.
- The EN/FR account-support form copy describes the fresh challenge. The
  existing hosted privileged-MFA What's New entry was updated in both
  languages.

## Boundaries and follow-up

- This slice covers only platform Site Admin Hub-role changes. Tenant officer
  assignments/revocations and delegation grants/revocations were subsequently covered in
  [`session-knowledge-2026-09-27-org-authority-step-up.md`](session-knowledge-2026-09-27-org-authority-step-up.md).
  Delegation/officer revocations, publication, sensitive exports, account
  recovery, deletion, and other privileged actions still need route decisions.
- In self-hosted/evaluation configurations with MFA disabled, the route keeps
  its existing behavior. If MFA is enabled, the route checks a fresh code.
  UnionOps-operated hosted customer mode requires production TOTP and fails
  closed when it is not available.
- The route tests cover missing-code direct API bypass, rejected challenge,
  attempt-limit response and `Retry-After`, successful correlated mutation,
  code omission from audit, and a misconfigured hosted profile. The full
  Vitest suite, TypeScript, and ESLint remain unverified because dependencies
  are not installed. No production host or database was available.
- `setUserRoles` commits its role change before the route appends the success
  audit event, matching the existing route pattern. A durable transactional
  audit/outbox design remains a broader audit-integrity question.
