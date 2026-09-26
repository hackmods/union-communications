# Account and organization access uplift: resume plan

Status: **complete on 2026-09-26** (branch `feat/account-organization-access`). Shipped as incremental commits ending in Division-backed selectors, docs, and What's new. Live Postgres RLS insert smoke was not available on this Windows sandbox — static tests + SQL review only for migration `0063`.

## Intended account and organization model

1. A platform administrator operates the platform and may provision unions, collectives, locals, and paid entitlements across unions. Operational access to member or case records remains role and membership scoped wherever possible.
2. A union administrator belongs to one invited union. The role manages that union's Brand Kit/theme and can view a **metadata-only** directory of the union's local tenants **only** when a platform administrator explicitly enables the paid tenant-directory entitlement. It has no default cross-local casework access and cannot grant its own entitlement.
3. A bargaining collective is an optional grouping within a union, such as CAAT-S or CAAT-A. The existing `Division` entity is the intended backing model. A local can belong to one collective or none; multiple collectives can belong to one union. A collective is distinct from a local and from a collective agreement bargaining-unit code.
4. A local, such as 243, is a tenant/workspace under a union and optionally a collective. Its officers see their own local unless explicitly granted another active local membership.
5. A committee or organizing group is a joinable Portal Circle. It may be local scoped or union scoped and may reference a collective. It is not a local tenant and should not inherit local casework. Membership and invitation rules must be explicit.
6. Account setup and selection should read in the order **union → optional collective (including Other / no collective) → local or group**, while keeping the different access implications clear. Brand Kit catalog choices suggest names/styles; they do not assign Hub membership or become authorization sources.

## Shipped checklist

- [x] Docs: `docs/VISION.md`, `docs/RBAC.md`, `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`
- [x] Paid directory entitlement + own-union MFA-gated metadata route + platform Brand Styles toggle
- [x] Tenant scope to active local membership; `create_collective` platform-only; locals validate collective ownership / allow none
- [x] Remove implicit `union_admin` / `division_admin` cross-local authority
- [x] Union brand + directory Hub pages and i18n (`hub.unionAdmin.*`, including `directoryDivision`)
- [x] Portal Circle `division_id` + migration `0063` + `app_circle_create_allowed` (search_path set; MFA left to host opt-in like other Portal inserts)
- [x] `UnionLocalSelect` driven by Division collectives (not bargaining-unit codes); invite/assign/access-request callers pass `divisionId`
- [x] What's new: `union-admin-brand-directory` (Hub audience)

## Verification notes

- Focused unit suites for selector, tenant/persist, portal circle create, union brand/directory, and union-admin session passed on this branch.
- `npm run lint` + broader unit/smoke should be green before merge.
- Disposable Postgres RLS insert/read smoke for eligible/ineligible Circle actors was **not** run here — record that limitation until an operator host verifies.
