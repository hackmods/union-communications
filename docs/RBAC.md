# RBAC & Tenancy

## Roles and scoped relationships

Account roles are not an authority hierarchy. Effective authority is resolved
from the active account and union, active local memberships, term-bounded
officer assignments, scoped delegations, resource ownership/participation, and
the feature's policy. `accessibleLocalIds` remains a context-switch hint; it is
not a membership or permission grant.

## Permissions Matrix

| Role | Scope | Comms | Grievance | Bumping |
|------|-------|-------|-----------|---------|
| `platform_admin` | Platform operations | R/W audit | Operational metadata; exact-case audited break-glass | Feature-specific admin |
| `union_admin` | Union configuration | R/W templates | Aggregate metadata/configuration | Feature-specific admin |
| `division_admin` | Division configuration | R/W templates | Aggregate metadata/configuration | Feature-specific admin |
| `local_president` | Active local assignment | R/W brand | Standard local cases; restricted cases by assignment | Local authority |
| `vice_president` | Active local assignment | R/W brand | Same normal local authority as president | Local authority |
| `grievance_officer` | Active local assignment | — | Full local casework, including restricted files | — |
| `local_steward` | Active local assignment or case assignment | R | Assigned R/W | Read committee |
| `local_exec` | Active local assignment | R/W | Non-identifying summary; restricted cases by assignment | Read |
| `stability_member` | Committee | — | — | R/W committee |
| `solo_account` | User | R/W | Own cases | Own workspace |

### UnionOps Data

The Data workbench is local-scoped and requires MFA plus PostgreSQL. Platform, union, and division admins may manage the active local's datasets and imports; the local president may manage their own active local. Local executives, stewards, members, and Portal accounts have no Data access in the first release. Person records created from imports are data records only: they do not create login accounts, invitations, roles, or Portal access.

## Hard Rules

1. **No cross-union reads** — ever, including `platform_admin` viewing content (requires audited break-glass)
2. **Cross-local access** — administrative roles receive only the configuration or aggregate capabilities documented by each feature. They do not inherit confidential case content access from rank. Local roles require an active local membership and scoped office assignment. Missing local context denies local-scoped access.
3. **Collection filter** — optional `bargainingUnitId` on session filters lists (grievances, snippets). Missing collection on a row still matches when filtering.
4. **Grievance access** — the involved member gets a member-safe projection; case workers and explicit participants get only their assigned access level; grievance officers have local casework access; presidents and vice-presidents have standard local case access; executives get a non-identifying summary. Restricted cases suppress leadership/executive defaults.
5. **Module visibility** — a feature must be enabled for the tenant; College Bumping requires `modules.bumping = true`. Durable Officer Hub casework requires configured MFA.
6. **Server-side enforcement** on every route; UI hiding is secondary
7. **MFA required** for grievance and bumping modules (Phase 2+)
8. **Site feedback inbox** is operator product mail (`platform_admin` only). It is not tenant content and is not a cross-union read. Any signed-in Hub or Portal user may *send* home; they cannot list other people’s notes.

## Active Hub context

JWT / session may carry:

- `localId` — active local (switcher for elevated multi-local users)
- `bargainingUnitId` — active Collection (FT/PT)
- `accessibleLocalIds` — locals the user may switch into

Clearing `localId` means there is no active local context. Local-scoped features
deny access until a valid local is selected; administrative capabilities that
cross locals must be checked separately by each feature.

## Solo Accounts

Small one-off accounts for individual stewards without full local setup:

- Create grievances tagged to `solo_account` user
- No local branding unless they join a local later
- Can export data; migrate to local on invite

## Invitation Flow (Phase 6 onboarding)

1. An authorized administrator creates or finds a local and invites a user.
2. Invite acceptance creates a local membership; office authority is represented by a separate canonical assignment.
3. Confidential Hub access requires MFA. Revoking a membership or office invalidates the user's session version.

Hub stays invite-only. There is no public `/app/register`.

## Audit Log

Immutable log on every grievance/bumping access; query UI at `/app/audit` for elevated officers:

```typescript
{ userId, action, resourceType, resourceId, unionId, localId, timestamp, ipHash }
```

No deletes. Retained per `docs/COMPLIANCE.md` retention policy.

## Site Admin / Platform Operator (operational access and break-glass)

The `/app/site-admin/*` surface manages platform operations; that role does
not grant grievance content access. Grievance break-glass is separate: an
MFA-verified platform administrator must name one exact grievance, provide a
reason, and receives a 30-minute audited grant. It does not allow search or
grievance list access. Other site-admin actions take an explicit
`requireSiteAdminSession()` gate AND emits an `audit_log` entry with:

- `resourceType: "site_admin"`
- `action: "site_admin.<noun>.<verb>"` — e.g. `site_admin.user.cross_tenant_read`,
  `site_admin.user.force_password_reset`, `site_admin.local.archive`,
  `site_admin.demo.preview_purge`, `site_admin.user.list`
- `resourceId`: the affected row id (or the route slug for collection reads)
- `metadata`: free-form, flat string keys, persisted as JSONB
  (`audit_log.metadata jsonb`, populated since 2026-09-17)
- `userId`: the operator's account id (`platform_admin` role, not the
  target — that's `metadata.targetEmail` etc.)

The site-admin surface is **strictly role-gated to `platform_admin` + MFA**. There
is no `union_admin` / `local_president` fallback: even if the same data
is reachable through a tenant-scoped page, the site-admin route returns
403 for non-platform-admin roles. The RBAC contract is the same as any
audited break-glass: the operator's session is authenticated, their
action is logged, and the diff is reversible (`archived_at`/`restored_at`
instead of hard delete for v1).

### Union customization (content)

- Root (`platform_admin` + configured MFA + durable auth) authors shared customization under an explicit target union context. That path does **not** grant grievance, roster, or Portal rights.
- Maintenance grants (`CUSTOMIZATION_DELEGATION_ENABLED`) may allow draft/edit/publish only for listed kinds/scopes; they never escalate Hub roles.
- Ordinary readers receive authorized DTOs only (`loadCustomizationContent` / `/api/customization/content`). Brand Kit preset → tenant slug maps presentation scope; forged scope IDs are ignored.
- Hosted maintenance entitlements may block new edits when configured; they never paywall free public Comms or grant membership.

See [`docs/audit/session-knowledge-2026-09-17-site-admin.md`](audit/session-knowledge-2026-09-17-site-admin.md)
for the schema and the foot-guns around `users.union_id` FK / `is_demo` /
`email_change_tokens` / `session_version`.
