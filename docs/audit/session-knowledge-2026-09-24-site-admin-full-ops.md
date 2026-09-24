# Session knowledge — Site admin full ops (2026-09-24)

## Problem

Site admins hitting `/app/configuration` without a home `unionId` saw steward-only copy (“Ask your president”) because `GET /api/tenant` returned 400 and the UI treated any load failure as read-only. Presidents could also mint local numbers via Hub onboarding, which inverted the soft-launch operator model.

## Changes

1. **`GET/POST /api/tenant`** — `platform_admin` may pass `unionId` (query or body). Homeless operators get `{ needsUnionContext, unions }` instead of a hard 400.
2. **`PresidentConfiguration`** — union picker; load errors ≠ steward banner; Site Admin card → configuration.
3. **Mint / elevate** — `canMintLocal` / `canElevateLocalNumber` = `platform_admin` only. `create_local` 403 for presidents. Invite president + find-or-create local = site admin only. `union_admin` invite ladder no longer includes `local_president`.
4. **Roles editor** — `PATCH /api/site-admin/users/[id]/roles` + Account support UI; refuses stripping the last `platform_admin`; bumps `sessionVersion`.

## Do not

- Treat presidents as the authority for minting local numbers.
- Cross-union grievance/content reads for platform_admin (unchanged).
- Let `union_admin` regain elevate without an explicit product decision.
