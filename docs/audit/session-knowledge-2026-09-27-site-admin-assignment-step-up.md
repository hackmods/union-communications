# Site Admin account-assignment step-up (2026-09-27)

## Scope

The host-wide account-support tool can restore or reassign a user's union and
primary local, create a local, or move a member between active locals. This
cross-tenant authority operation previously depended only on the Site Admin
session gate and appended its audit after the write.

## Implementation

- `POST /api/site-admin/users/[id]/assign-local` accepts an optional `mfaCode`
  and invokes the shared fresh-MFA verifier after request validation but before
  the membership adapter can read or change account assignment state.
- Every route response carries a server-generated request ID and is
  `private, no-store`. Denial, verification, authorization, and result events
  use the same correlation. MFA codes, names, local labels, and the raw
  requested assignment are excluded from audit metadata.
- The route requires an authorization audit append before invoking
  `assignUserLocal`. On success, it appends a result event scoped to the
  assigned union/local with membership ID and coarse create/replace counts.
- If the result append fails after the database helper returns, the route
  reports that the membership may have changed. The UI locks further submits
  and instructs the operator to refresh and inspect the account before retry.
- On a single-local conflict, the first request's challenge is considered
  consumed. The form displays the replace decision and obtains a new challenge
  for the second request. This prevents replay of the first code after changing
  the requested operation.
- `AssignLocalForm` has bilingual fresh-code, failure, retry-limit,
  unavailable, cancel, and uncertain-result states.

## Verification authored

Focused API tests cover missing-MFA denial before the assignment helper,
correlated authorization before the helper, authorization-audit failure
withholding, single-local conflict, successful result scope, and post-write
audit uncertainty. Static TypeScript route syntax and EN/FR key parity pass.
Vitest, TypeScript, and browser checks cannot run because dependencies are
absent from the checkout. Hosted TOTP, the owner/runtime database paths,
deployed Postgres/RLS behavior, and multi-operator audit evidence remain
unverified.

## Follow-up

The local-assignment helper may create a union or local before later assignment
steps fail; inspect its transactional boundaries and retry semantics before
relying on the authorization/result log pair as a complete business audit.
Continue reviewing Site Admin local archive/restore and union membership
policy mutations. No organization deletion or operator-initiated MFA-reset
route was found in the current route inventory.
