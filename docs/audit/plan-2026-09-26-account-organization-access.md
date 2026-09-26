# Account and organization access uplift: resume plan

Status: **in progress on 2026-09-26**. This file is a handoff for resuming the current `/goal` request. Do not treat the uncommitted work listed below as shipped. The user asked for agent mode and incremental commits.

## Intended account and organization model

1. A platform administrator operates the platform and may provision unions, collectives, locals, and paid entitlements across unions. Operational access to member or case records remains role and membership scoped wherever possible.
2. A union administrator belongs to one invited union. The role manages that union's Brand Kit/theme and can view a **metadata-only** directory of the union's local tenants **only** when a platform administrator explicitly enables the paid tenant-directory entitlement. It has no default cross-local casework access and cannot grant its own entitlement.
3. A bargaining collective is an optional grouping within a union, such as CAAT-S or CAAT-A. The existing `Division` entity is the intended backing model. A local can belong to one collective or none; multiple collectives can belong to one union. A collective is distinct from a local and from a collective agreement bargaining-unit code.
4. A local, such as 243, is a tenant/workspace under a union and optionally a collective. Its officers see their own local unless explicitly granted another active local membership.
5. A committee or organizing group is a joinable Portal Circle. It may be local scoped or union scoped and may reference a collective. It is not a local tenant and should not inherit local casework. Membership and invitation rules must be explicit.
6. Account setup and selection should read in the order **union → optional collective (including Other / no collective) → local or group**, while keeping the different access implications clear. Brand Kit catalog choices suggest names/styles; they do not assign Hub membership or become authorization sources.

## Already committed on this task

- `bcad395d` documents the hierarchy and access intent in `docs/VISION.md` and `docs/RBAC.md`.
- `6e999dab` adds a default-off `unions.paid_tenant_directory_enabled` entitlement, an own-union, MFA-gated, metadata-only `/api/union-directory` route, and a platform-only audited entitlement route. `fd60dd3e` updates the generated database shape contract. Verify behavior against the current branch because later uncommitted edits touch the directory route.
- `7e832d85` scopes `/api/tenant` local/collection reads and writes to active local membership and fixes a forged preset fallback.
- `a7046497` adds a first selector pass and removes diagnostic data exposure from local assignment. Its displayed “collective” is currently inferred from child CA bargaining-unit codes; replace or clearly distinguish this from the `Division` grouping before calling the requested hierarchy complete.
- `5004ca71` removes implicit cross-local access from `union_admin` and `division_admin` in common authorization, RLS, bylaws/proposals, ledger/tasks, and invitations. Platform operations remain separately authorized.

## Current uncommitted work: preserve and complete

The working tree contains edits across tenant, Portal, site admin, and a second agent's union admin pages. Run `git status --short` before editing, and do not reset or overwrite any of it. The security-review agent was asked to pause and provide a status before this plan was written.

### Tenant and collective model

- `src/types/tenant.ts`, `src/lib/tenant/{overlay,loader,persist}.ts`: load, persist, and expose multiple union `Division` rows, with a durable `createDivisionDurable` and rollback. Confirm the active local's `divisionId` selects its collective, and an unassigned local does not silently inherit the first one.
- `/api/tenant`: `create_collective` is platform-only; `create_local` must validate the collective belongs to the target union and must allow no collective. Non-platform response contexts must filter locals, CA collections, and collectives by active local memberships. Recheck all write actions for the same rule.
- `TenantOnboardingWizard`: create/select collective before local; Other/no collective choice; Brand Kit preset is a naming suggestion rather than a trust or membership grant. Check EN/FR wording and verify the layout.
- Site admin locals page and `CreateLocalForm`: show/create multiple collectives and select optional collective for a new local. Filter archived collectives in server queries. `/api/site-admin/locals` must reject a foreign collective, conflicting local number reassignment, and inactive/unscoped actor; replace raw DB error messages with safe errors.

### Portal group model

- `portal_circles.division_id` and migration `0063_circle_collective.sql` associate a union-scoped Circle with an optional collective; memory/Postgres adapters and API types carry it. `POST /api/portal/circles` validates union/local/collective consistency; `/api/portal/station` supplies only actor-visible collective choices; `PortalStation` provides a collective picker for union groups.
- Migration `0063` also replaces the Circle creator insert policy with a constrained `app_circle_create_allowed` function. Review `SECURITY DEFINER` search path, union membership/MFA conditions, local scope, and insert plus RETURNING behavior. Run database contract checks and, if a disposable Postgres is available, an actual RLS insert/read smoke for eligible and ineligible users. Do not claim RLS validation if only static checks run.
- `canCreateUnionScopedCircle` allows platform/own-union admin and active union president or vice-president with matching local membership. Confirm route, UI, and RLS agree. Division admin has no implicit create authority.
- A Circle remains an invited/joinable group, not a replacement for a local tenant. Review the join and invite UI and ensure collective association never grants implicit casework or broad union directory visibility.

### Union admin and paid directory

- The security-review agent is adding own-union Brand Kit/theme routes and `/app/union-brand`, plus `/app/union-directory` and Hub links. Review every API for invited own-union actor, active status, MFA, CSRF for writes, no request-controlled target union ID, and no extra tenant or case fields. Keep platform-only paid entitlement management in the site admin Brand Styles UI.
- Add/verify the `hub.unionAdmin` English/French keys used by those pages. The agent requested: `brandLink`, `directoryLink`, `backToHub`, `brandTitle`, `brandIntro`, `presetLabel`, `presetNone`, `themeHeading`, `themeHint`, `themeEnabled`, `primaryColor`, `secondaryColor`, `accentColor`, `headlineFont`, `bodyFont`, `save`, `saving`, `saved`, `loadFailed`, `saveFailed`, `invalidColor`, `directoryTitle`, `directoryIntro`, `directoryLoading`, `directoryUnavailable`, `directoryUnpaid`, `directoryEmpty`, `directoryLocal` (`{number}`), `directoryDivision` (`{id}`). Confirm exact use before finalizing.
- The platform Brand Styles page currently has an uncommitted paid-entitlement checkbox and PATCH call; confirm unchecked by default and platform-only enforcement. The directory should provide local metadata only; private casework does not follow the paid entitlement.
- Consider whether the paid directory must also show *group metadata* to match the user's “tenants of their union” concept. If added, expose only fields needed for navigation with a separately reviewed union-scoped query and entitlement gate. Do not accidentally use a broad Portal bypass or treat Circle membership as a directory grant.

### Selection UX and source of truth

- The committed `UnionLocalSelect` uses collective agreement bargaining-unit subgroup codes, not the new `Division` records. Follow the selector's callers (invites and local assignment), update payloads to carry actual collective ID and each local's collective ID, and ensure backend validation matches the selected path. Keep agreement bargaining units as a separate field where needed.
- Provide an explicit route to create/select a group at the same decision point as a local where the actor has permission. A local and a Portal Circle have different permissions and should be labeled accordingly. Ensure “Other / no collective” works for unions whose Brand Kit has no matching option.
- Check phone width and keyboard/label behavior for admin and Portal forms. Do not rely on a screenshot or UI state from another task without verifying this branch.

## Verification and release sequence

1. Incorporate the security-review agent's final status; inspect the complete diff, resolve shared-file overlap, and complete the remaining code paths above. Do not commit while the agent is editing shared files.
2. Validate migration journal `0063` and regenerate `docker/db-required-shape.json` with `npm run db:contract:generate`; run `npm run db:check`. On this Windows sandbox, the esbuild-based commands may require `exec_command` with `sandbox_permissions: "require_escalated"`.
3. Run focused suites: tenant route/persist tests, portal Circle creation and station tests, union brand/directory/entitlement tests, authorization/RLS tests, DB deploy contract tests, and public copy parity. Expand testing only to cover concrete residual risk. Run `npx tsc --noEmit` and `npm run lint`. For the large multi-file milestone, run `npm run test:unit` and `npm run test:smoke` per AGENTS.md. Vite spawn may require sandbox escalation.
4. If a local Postgres test service exists, exercise migration/RLS as an unprivileged actor for own union, foreign union, paid/unpaid directory, and Circle insert. Record the exact command/results in the final report; otherwise state the static-test limitation.
5. Update `docs/RBAC.md` and `docs/ARCHITECTURE.md` as needed for final behavior. Add a dated milestone entry to `docs/PROGRESS.md`. Steward-facing changes need a `/updates` item in `src/lib/constants/updates.ts` plus meaningful EN/FR copy, per `.cursor/rules/whats-new.mdc` and `.cursor/rules/i18n-public-copy.mdc`.
6. Commit coherent tested slices as work is completed, then verify clean status. Git metadata for this worktree is outside the writable root; `git add`/`git commit` have required sandbox escalation. Do not force-push or amend published commits. No PR or deploy has been requested; if a PR is created, attach it using `mcp__codex_app__attach_artifact`, open it ready for review, and follow repository merge instructions only after CI is green.
7. Summarize the final account hierarchy, paid entitlement default and scope, the UI path, security verification, commits, and any remaining limitations. Mark the goal complete only when the requested behavior is implemented and verified, not because the session is ending.

## Environment and prior checks

- Repository: `C:\Users\Ryan\.codex\worktrees\8fb6\union-communications` on a detached HEAD. An ignored `node_modules` junction points to `C:\Users\Ryan\Projects\union-communications\node_modules` for this workspace.
- Before the latest uncommitted site-admin and union-admin edits, focused tests, TypeScript, lint, and `db:check` passed. Re-run them after the current integration; prior results do not validate current uncommitted code.
- Review `docs/audit/current-ground-truth.md`, `docs/audit/session-knowledge-2026-09-20-verified-db-deploy.md`, `docs/audit/adr-020-database-deployment-contract.md`, and `docs/audit/session-knowledge-2026-09-25-union-brand-bridge.md` before altering deploy or Brand Kit contracts. The retired `platform_meta` data-version path must not be revived.
