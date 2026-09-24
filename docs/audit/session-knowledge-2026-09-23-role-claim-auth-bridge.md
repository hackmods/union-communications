# Session knowledge — role-claim auth bridge (2026-09-23)

## Problem

Hub surfaces mixed two auth styles:

1. **Role-only** (`canManageInvites`, `canAccessOfficerRoster`, `canManageTenantOnboarding`, hub catalog) — trusts `users.roles` / JWT roles.
2. **Relationship capability** (`decideCapability` → `memberships.manage` / `officers.manage` / …) — requires `local_memberships` + `officer_assignments` rows.

`db:seed-admin` and older production accounts often have roles on `users` but **no** membership/assignment rows. The page rendered; APIs returned 403 (invites load error was the first report).

## Surfaces hit by the same pattern

| Surface | Nav / page gate | API / capability gate | Failure mode |
|---|---|---|---|
| `/app/invites` | `canManageInvites` | was `memberships.manage` | Load error callout |
| Member access requests (on invites) | (same page) | `memberships.manage` + `activeLocalId` | Silent empty / 403 |
| `/app/officers` | `canAccessOfficerRoster` (roles) | page + `/api/officers*` → `officers.manage` | Redirect home / write 403 |
| `/app/organization` | page `decideCapability` | `/api/organization/*` | Redirect home |
| Portal circle create | portal UI | `circles.create` | Create 403 |
| Grievance create / access manage | module role gate | `grievances.case.write` / `access.manage` via assignment | Soft-fail create |

Role-aligned already (no patch needed): `/app/onboarding`, `/app/configuration`, `/api/tenant` — all use `canManage*` role helpers.

## Fix shipped

1. **`mergeRoleClaimBridge` / `relationshipsFromRoleClaims`** — synthesize primary-local membership + office from durable `users.local_id` + roles (same as memory `actorFromSession`).
2. **`resolveAuthorizationActor`** — apply the bridge after loading Postgres relationships; set `activeLocalId` from bridged membership.
3. **`decideCapability`** — `platform_admin` may use admin capabilities without a home union / across unions; `union_admin` stays home-union scoped. Admin roles also get `delegations.manage`.
4. **`db:seed-admin`** — `ensurePrimaryLocalAuthority` writes membership + office rows when `--local-id` is set.
5. **Invites API** — still role-gated (`canManageInvites`) so the board loads even if local was purged.

## Ops note

If `users.local_id` is null (demo purge orphan), the bridge cannot invent a local — use site-admin assign-local. Re-run `db:seed-admin` with `--local-id` to backfill relationships for bootstrap accounts.
