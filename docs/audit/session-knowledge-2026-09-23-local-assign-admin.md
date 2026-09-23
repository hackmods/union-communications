# Session knowledge — local assign restore & admin cleanup (2026-09-23)

## What shipped

- **Demo cleanup gate:** `SITE_ADMIN_DEMO_PURGE_ENABLED` (default off). Page redirects; APIs 404; site-admin card + Users link hidden unless CapRover sets the flag. Documented in `docker/.env.production.example` and `CAPROVER_POSTGRES.md`.
- **Membership policy:** `unions.membership_policy` = `multi_local` | `single_local` (migration `0055`). Unique active `(union_id, local_number)`; one active primary per `(union_id, user_id)`.
- **Integrity scan:** `/app/site-admin/membership-integrity` + `GET /api/site-admin/membership-integrity` (orphan locals, primary drift, dupe numbers, invite collisions, etc.).
- **Restore assign:** account-support `AssignLocalForm` → `POST /api/site-admin/users/[id]/assign-local`. Create local + policy on `locals/[union]`.
- **Shared `UnionLocalSelect`:** invites + access-request inbox. Local Number elevation = `platform_admin` | `union_admin` only; presidents session-local.

## Ops note after demo purge

Purging demo locals nulls `users.local_id` (`ON DELETE SET NULL`) and cascades memberships. Run membership integrity, then assign-local on orphaned accounts.

## Deferred

- Global email uniqueness across unions; auto-merge dupe local numbers; bulk user archive; fulfilling beta request → invite composer wiring beyond inbox assign fields.
