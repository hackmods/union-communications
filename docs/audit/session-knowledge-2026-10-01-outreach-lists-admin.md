# Session knowledge — 2026-10-01 — Site Admin outreach lists broken

## Symptom

`/app/site-admin/outreach-lists` looked broken: empty inventory even when lists existed, and entitlement checkboxes failed with a generic error when CapRover `UNIONOPS_OUTREACH_LISTS_ENABLED` was still false.

## Root causes

1. **RLS AND-trap (0088):** policies required `union_id = app.current_union_id` *and* (`cross_local` OR `platform_admin`). Site Admin GET set `{ platformAdmin, mfaVerified }` with no `unionId`, so inventory always filtered to zero rows.
2. **Missing `userId`:** even after adding a `customization_root(NULL, true)` bypass (product-news pattern), authorize must set `app.current_user_id` so the DEFINER helper can prove `platform_admin`.
3. **PATCH host gate:** entitlement updates returned 409 when the CapRover flag was off. Dual gate means entitlements may be prepared before host readiness; only **sends** need both gates. Email entitlements route already behaved correctly.

## Fix

- Migration `0094_outreach_lists_admin_rls.sql` — USING allows `customization_root(NULL, true)`; WITH CHECK uses `customization_root(union_id)` or tenant path.
- `authorizeOutreachListsAdmin` passes `userId`.
- PATCH no longer requires host flag; panel adds union selector, pause/resume, export, empty/error copy.
- Outreach policies added to `RLS_TENANT_POLICIES` (were missing from the contract).

## Verify after deploy

Redeploy so `0094` applies. Sign in as MFA-verified platform admin; inventory should list existing rows; entitlement toggles should save with host flag still off.
