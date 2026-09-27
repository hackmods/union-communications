# Session knowledge — hosted MFA at the Portal boundary

**Date:** 2026-09-27  
**Scope:** UnionOps-operated customer profile, Portal page and API access  
**Status:** Local code change; dependency-backed and live-host verification pending

## Finding

The hosted Hub MFA policy was role/capability-aware, but the Portal's shared
`requirePortalSession()` guard only checked sign-in, active account, union
membership, and Portal enablement. Portal pages used a separate page gate. That
left a boundary where a privileged officer could access Portal pages and APIs
without completing the TOTP check required elsewhere in the hosted profile.

Circle administrator access needs special care: circle membership is stored in
`portal_circle_memberships`, not in the general authorization actor's role,
assignment, or delegation rows. The actor resolver does not supply these
memberships, so checking only the JWT role list or actor alone misses a member
who administers a Circle.

## Change recorded

- Added a shared session-and-current-actor MFA check. In the hosted customer
  profile, current privileged roles, effective assignments/delegations, and
  Circle administrators need a verified session and actor before Portal access.
- Added a scoped adapter query for active Circle-admin membership. PostgreSQL
  checks the current union and authenticated user under the adapter's RLS
  context; the memory adapter mirrors the result for development/evaluation.
- The MFA status endpoint uses the same Circle-admin authority lookup to mark
  enrollment as required, and the Hub UI waits for server-resolved current
  authority before treating a hosted member session as exempt.
- Portal APIs return 403 when the policy fails. The Portal page guard redirects
  to the existing `/app/mfa` challenge/setup route.
- Kept basic `local_member` access exempt unless that account separately
  requires MFA. Evaluation and self-hosted behavior still follows the existing
  host policy.
- Updated ADR-017, Portal/operator guidance, the public EN/FR Security copy, and
  the existing `/updates` entry to describe the hosted policy.

## Verification and remaining work

Focused tests cover the role and host-policy branches, current delegated
authority, Circle-admin scope, inactive Circle exclusion, and legacy
MFA-disabled behavior. The Portal route inventory shows all `src/app/api/portal`
handlers call the shared guard; Portal pages pass through the Portal layout
guard. `node_modules` is absent, so Vitest, typecheck, lint, and browser tests
could not run. The PostgreSQL membership query has not been exercised against a
live RLS database. This does not complete the full privileged-route or
step-up-action audit.

## Lesson

When a capability's authority is stored outside the central role/assignment
tables, the MFA gate must resolve that current authority at the same boundary
as the protected content. Do not infer that a page is protected because its
navigation lives inside the Hub shell, and do not trust a stale token to reveal
current Circle administration.
