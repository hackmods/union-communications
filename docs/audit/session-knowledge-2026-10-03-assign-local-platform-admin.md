# Site Admin assign-local cross-tenant fix (2026-10-03)

## Symptom

Account support **Assign local** showed **Assignment failed / Assign local failed**
when a host operator assigned a member into another union (example: OPSEU Local
243) while the operator’s own `users.union_id` stayed on a different home tenant
(demo B7P). Leaving Bargaining collective optional was not the failure.

## Cause

`app_org_manage`, `app_sync_local_portal_membership`, and
`app_revoke_local_portal_membership` required `users.union_id = target_union`
even for `platform_admin`. Assign-local preferred the owner DB but skipped
`applyRlsContext` on that path, so SECURITY DEFINER portal sync still raised
scope/authority errors. App-role fallback then 500’d with an opaque catch.

## Fix

- Migration `0098_platform_admin_membership_manage` adds an MFA-verified
  `app.current_platform_admin` authority branch that does not require a matching
  home union (scope GUCs still bind to the target).
- `assignUserLocal` always applies RLS GUCs with `platformAdmin: true` (owner
  and app roles). Empty membership/user `.returning()` and known Postgres raises
  become coded results (`membership_authority_denied`, `membership_scope_denied`,
  `membership_sync_required`, `membership_write_blocked`) instead of crashing
  into a bare 500.
- AssignLocalForm maps those codes to bilingual Site Admin copy.

## Verification

Unit coverage: classify helper, platformAdmin GUC binding, empty returning,
route coded denial vs opaque `assignment_failed`, RLS contract on `0098`.
Hosted CapRover still needs a live Site Admin assign into a non-home union after
migrate to prove end-to-end.
