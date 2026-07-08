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
| `local_steward` | Local | R | Assigned only | Read committee |
| `local_exec` | Local | R/W | Read summary | Read |
| `stability_member` | Committee | — | — | R/W committee |
| `solo_account` | User | R/W | Own cases | Own workspace |

## Hard Rules

1. **No cross-union reads** — ever
2. **No cross-local reads** except elevated roles with scope
3. **Module visibility** — API + UI hide disabled modules
4. **Server-side enforcement** on every route
5. **MFA required** for grievance and bumping (Phase 2+)

## Audit Log

Immutable log on every grievance/bumping access: `userId`, `action`, `resourceId`, `unionId`, `localId`, `timestamp`.
