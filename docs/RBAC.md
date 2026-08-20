# RBAC & Tenancy

## Role Hierarchy

```
platform_admin
  └── union_admin
        └── division_admin (optional)
              └── local_president
                    └── local_exec / local_steward / stability_member
solo_account (parallel — no local required)
```

## Permissions Matrix

| Role | Scope | Comms | Grievance | Bumping |
|------|-------|-------|-----------|---------|
| `platform_admin` | Platform | R/W audit | R/W audit | R/W audit |
| `union_admin` | Union | R/W templates | Configure divisions | Enable modules |
| `division_admin` | Division | R/W templates | Configure locals | Configure committee |
| `local_president` | Local | R/W brand | Full local | Full local |
| `local_steward` | Local | R | Assigned R/W | Read committee |
| `local_exec` | Local | R/W | Read summary | Read |
| `stability_member` | Committee | — | — | R/W committee |
| `solo_account` | User | R/W | Own cases | Own workspace |

## Hard Rules

1. **No cross-union reads** — ever, including `platform_admin` viewing content (requires audited break-glass)
2. **Cross-local reads** — only `union_admin`, `division_admin`, and `platform_admin` may read other locals without switching. `local_president` / `local_exec` stay pinned to **active** `session.localId` (Hub context switcher). Stewards stay on their local + optional collection.
3. **Collection filter** — optional `bargainingUnitId` on session filters lists (grievances, snippets). Missing collection on a row still matches when filtering.
4. **Grievance assignment** — stewards see and edit only assigned cases unless elevated; they may create new cases (assigned to themselves)
5. **Module visibility** — College Bumping only when `modules.bumping = true` in union/division config
6. **Server-side enforcement** on every route; UI hiding is secondary
7. **MFA required** for grievance and bumping modules (Phase 2+)
8. **Site feedback inbox** is operator product mail (`platform_admin` only). It is not tenant content and is not a cross-union read. Any signed-in Hub or Portal user may *send* home; they cannot list other people’s notes.

## Active Hub context

JWT / session may carry:

- `localId` — active local (switcher for elevated multi-local users)
- `bargainingUnitId` — active Collection (FT/PT)
- `accessibleLocalIds` — locals the user may switch into

Clearing `localId` for cross-local admins means “all locals in union.”

## Solo Accounts

Small one-off accounts for individual stewards without full local setup:

- Create grievances tagged to `solo_account` user
- No local branding unless they join a local later
- Can export data; migrate to local on invite

## Invitation Flow (Phase 6 onboarding)

1. `platform_admin` (or `union_admin`) creates or finds a local, then invites `local_president` by email
2. Local president confirms the local, opens Hall, and invites stewards, exec, and `local_member` (Portal)
3. Users accept → role assigned → MFA setup for confidential Hub modules

Hub stays invite-only. There is no public `/app/register`.

## Audit Log

Immutable log on every grievance/bumping access; query UI at `/app/audit` for elevated officers:

```typescript
{ userId, action, resourceType, resourceId, unionId, localId, timestamp, ipHash }
```

No deletes. Retained per `docs/COMPLIANCE.md` retention policy.
