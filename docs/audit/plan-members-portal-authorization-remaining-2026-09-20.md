# Plan — Remaining Members Portal authorization and persistence work

**Plan created:** 2026-09-20
**Status refreshed:** 2026-09-21
**Status:** Follow-up plan; implementation is incomplete.
**Companion:** [implementation record](members-portal-authorization-review-and-remediation-2026-09-20.md) · [session lessons](session-knowledge-2026-09-20-members-portal-authorization.md)

## Goal

Finish the remaining work needed for consistent server-authoritative membership, officer/delegated authority, grievance privacy, and durable Local Portal behavior. Keep the existing route and adapter architecture where it fits. Do not enable Portal Postgres mode until the live database gates and compatibility steps below pass.

## Current verified state

**Rebase note (2026-09-21):** Upstream `main` had already claimed `0040` for Data Workbench. The authorization migrations are now `0041`–`0052`, the merged journal contains 53 entries, and the generated contract declares 104 tables and 98 policies. Earlier live database results used the feature-only chain; verify the combined chain in CI before treating the new generated counts as live evidence.

- The final journal preserves upstream `0040_data_workbench` and appends the authorization/Portal chain as `0041`–`0052`; the merged journal contains 53 indexed entries. The generated contract declares 104 tables and 98 policies. Re-run `db:check` and fresh database gates in CI. Pre-rebase disposable PostgreSQL verification exercised the feature chain through its archive-access migration (then tagged `0051`) at 94 tables and 88 policies; the combined post-rebase chain still needs fresh-database/CI verification.
- Shared actor/capability scaffolding and the Grievance access matrix are implemented, including member-safe case projection and server-owned privacy/participant records.
- Organization APIs/UI exist for membership, office assignment, delegation, and effective access. The UI shows account state, can switch the primary local, captures office terms, and links canonical assignments to existing roster entries. Invitations use effective capabilities. Committee user-link management is implemented; migration `0051` (the pre-rebase `0050`) was live-verified for same-local linking, wrong-local denial, and missing-local denial. Postgres-backed browser lifecycle coverage remains.
- Portal schemas/RLS, async `PortalAdapter`, Postgres adapter, scoped API call sites, `PORTAL_DB_BACKEND` health flag, conditional memory warning, and Hall self-enrollment path are implemented. The feature-only migration chain, seed, `db:rls-smoke`, expanded Portal durability smoke, and process-restart smoke passed as restricted `unionops_app` before rebasing. The final combined chain—including upstream Data Workbench—has not yet passed a fresh deploy/RLS/durability run.
- Cross-feature role checks remain in several modules. A compatibility layer was added, but this is not the full actor/capability migration.
- Missing-local fail-open behavior was closed for list and direct-ID scope in elections, check-ins, discussions, informal logs, expenses, polls, ledger, minutes, travel, tasks, committees, officer records, meetings, bumping, time records, bylaws, and proposals. Explicit cross-local admin paths remain; local owner/assignee/requester paths are preserved where the feature has them. This is a bounded scope fix, not completion of the actor/capability migration (see L23–L24 in the companion lessons file).
- A follow-up CA snippet review found same-union direct-ID reads and writes did not check local ownership. List/detail/mutation now use the resolved actor's current membership and local scope; local officers cannot write another local's snippet. This remains a legacy in-memory feature and will need the same actor/capability migration as adjacent grievance support surfaces.
- Durable actor resolution now derives the selected local and bargaining unit from the current active membership row, clearing stale session scope after transfer or revocation. Additional database-backed actor-resolution coverage remains part of the revocation test work.
- A shared `localScopeFilter` now represents absent local context with a nonmatching sentinel unless an explicit cross-local capability or owner-only query applies. New paired regressions cover query filters and direct record policies.
- Earlier unit suite passed: 2,033 tests across 322 files, 1 skipped. Typecheck, build, lint, and DB shape checks passed at that checkpoint; lint has one pre-existing unused-variable warning and the build retains the existing Edge `crypto` warning.
- Latest focused missing-local scope run passed 16 suites / 92 tests, including the new cross-feature and Hub governance scope regressions. `npm run typecheck` passed after these changes.
- The latest full unit run passed 2,047 tests across 325 files, with 1 skipped, using two workers after PDF layout timeout noise under higher parallelism; the discussion local-scope compatibility check passes after removing an unintended creator exception, and the new snippet and committee-link tests pass.
- `src/lib/snippets/api-routes.test.ts` passes 13 tests including no-local denial and wrong-local detail/write coverage; typecheck passed after the snippet changes.
- Snippet policy and route tests pass 20 cases together with the missing-local and governance regression files; typecheck and targeted ESLint pass after deriving actor scope from normalized membership.
- Portal desktop/mobile browser verification against UnionOps on a dedicated port passed all 22 checks. The Portal smoke fixtures now target the Local 7 Hall used by memory/demo seed. A sticky-tab overlap that blocked the Many hands start button was fixed and verified.
- Hub organization browser verification passed all 12 existing surface checks plus a new membership/authority page-load check. Full membership, office, delegation, and revocation browser flows still need a seeded Postgres app fixture because these APIs require Postgres.
- An earlier broad smoke run reused port 3000, which belonged to an unrelated app; discard those results. A first corrected-port run exposed the Local 243/Local 7 fixture mismatch, which is now fixed for Portal desktop/mobile specs.
- Pre-rebase verification used an isolated disposable Postgres 16 container, not a production database. The feature-only chain reached its archive-access migration (then tagged `0051`; now `0052`) with 94 tables / 993 columns / 88 policies; seed, RLS, Portal durability, and a standalone Next process restart passed as `unionops_app`. This does not verify the combined journal after adding upstream `0040_data_workbench`. A representative `0039`-era upgrade fixture, full adapter parity, broader RLS/API matrix, member/officer browser flows, and production cutover remain open.
- Never use the visible Docker database attached to the saved base-project Compose stack as a disposable migration target. The successful smoke fixture was separately provisioned and disposable. No production export, production migration, or cutover was performed.

## Remaining blockers and recommended order

| Order | Work | Dependency | Done when |
|---|---|---|---|
| 1 | Build a representative `0039`-era upgrade fixture and migrate it through current tail `0052`, after fresh verification of the combined migration chain. Full standalone process restart was verified against the pre-rebase feature chain. | Local fixture engineering | Backfilled users, roles, committees, grievances, attachments, demo Circles, and legacy Portal rows retain intended access/content after upgrade; RLS and smoke gates pass at the current tail. |
| 2 | Complete method-by-method Postgres adapter parity and broaden independent API/RLS allow-deny coverage, especially remaining child-table writes, roster invitations, ordering, and membership/Hall revocation. | Local engineering and disposable Postgres | A shared operation inventory is fully checked off or differences documented; sensitive operations have both API and restricted-role SQL tests; forced failures leave no partial rows. |
| 3 | Finish member/officer browser flows and remaining grievance creation UX: registered member selection, privacy, initial case worker, access explanation, member updates, safe attachment sharing, revocation, and expiry. | Local UI/API work; Postgres-backed browser fixture | Browser, mobile, keyboard, and accessibility flows prove the member-safe DTO boundary and immediate removal of revoked/unpublished content. |
| 4 | Continue the bounded shared-capability migration and administrator narrowing across Members Portal features. Start with organization surfaces/committees, then casework/collaboration, operations, and records. | Local policy decisions per feature | Each feature documents ownership/participants, module gating, admin scope, and has wrong-union/local/missing-local/revocation tests; legacy role helpers are no longer final grants. |
| 5 | Preserve selected runtime-only memory activity, rehearse restore/rollback, and stage `PORTAL_DB_BACKEND=postgres`. | External operator/data-owner sign-off | Required exports are recorded, staged health and restart gates pass, rollback is exercised, and the operator authorizes the backend switch. |

The production cutover is the only explicitly operator-blocked item here. It must remain opt-in until data preservation and staged rollout are approved; it does not block orders 1–5.

## Execution rules

1. Read [ADR-020](adr-020-database-deployment-contract.md), [verified DB deploy contract](session-knowledge-2026-09-20-verified-db-deploy.md), [RBAC](../RBAC.md), [Compliance](../COMPLIANCE.md), and [Local Portal module notes](../modules/LOCAL_PORTAL.md) before DB/RLS/cutover work.
2. Keep migrations append-only. Update `_journal.json`, schema exports, RLS contract, and `docker/db-required-shape.json` with every schema/policy change.
3. Keep `DATABASE_URL` on the restricted `unionops_app` runtime role. DDL uses `MIGRATE_DATABASE_URL`; prove the runtime role is neither owner nor `BYPASSRLS`.
4. Use `withRlsContext` explicitly at every route/store boundary. No absent-local wildcard.
5. A memory-mode UI may explain unavailable persistence, but every API still authorizes independently and must not claim that unsupported writes succeeded.
6. Keep user-visible API routes and response shapes stable where possible. Add read-both/write-normalized bridges only for documented compatibility.

## Phase 0 — Establish a clean live verification fixture

### Work

- [x] Provision an isolated Postgres 16 database with separate migration-owner and restricted runtime credentials.
- [x] Record the pre-rebase verified feature-chain tail (`0051_portal_archive_access`, now `0052`) and isolated runtime role; the combined generated contract now declares 104 tables / 98 policies but has not yet been live-verified.
- [x] Resolve the stale Portal Local 243 smoke assumptions by aligning desktop/mobile checks with the current Local 7 Hall; keep other fixture identities explicit and consistent.
- Keep the existing cross-local president denial test; add a separate union/division administrator case only if that capability is intended and explicitly documented.

### Exit checks

- Tests use one declared fixture model and do not pass by skipping local membership checks.
- A fresh database fixture verified the pre-rebase feature chain through its archive-access migration; the combined 53-entry chain and a representative existing-upgrade fixture remain to be verified.

## Phase 1 — Complete the authorization foundation

### Work

- Audit `resolveAuthorizationActor` under the real runtime RLS policies. Confirm it can reload every active same-union membership, office assignment, and delegation needed for local switching without using an over-broad local context.
- Verify account archive/lock, membership ending, assignment revocation, delegation revocation/expiry, and `sessionVersion` changes take effect on the next request.
- Complete invitation coverage: new account, existing same-union account, existing other-union account, pending president assignment, wrong password, locked/archived account, and password/unrelated-role preservation.
- Verify linked officer roster account term lifecycle. Unlinked display-only roster rows must never grant authority.
- Complete normalized committee member linking and legacy unresolved-ID handling. **Code and pre-rebase live RLS verification are complete:** current migration `0051` (pre-rebase `0050`) adds same-scope committee FK/RLS checks; the Postgres adapter validates active same-local accounts and writes links transactionally; the UI selects active members and separates legacy roster labels. Focused tests and feature-chain live smoke verify same-local acceptance, wrong-local denial, and missing-local denial. Reverify it as part of the combined migration chain. Postgres-backed browser lifecycle coverage remains. The committee API gate still uses legacy role helpers; migration to the shared capability resolver belongs in Phase 5. Roster membership itself does not grant API access.
- Show membership effective dates clearly and test membership end/revoke behavior. Add database-backed browser verification for primary-local, account-state, office-term, delegation, and roster-link flows. Delegation create/list/revoke controls already capture capability, scope, dates, and reason; verify expiry and revocation behavior end to end.

**Status:** Invite acceptance already creates normalized membership and a canonical president assignment from the pending invite role; it preserves a same-union account password and rejects cross-union/locked/archived accounts. Invite list/create gates now use shared capabilities, including a regression check that a local president without local context cannot see union-wide invites. Organization UI covers primary local, account state, office terms, delegation details, and roster linking. Normalized committee member management is implemented through current migration `0051`, route-scoped RLS, active-account/local validation, transactional adapter writes, and a local-member picker with display-only legacy references. The corresponding pre-rebase `0050` live RLS checks passed; repeat them on the combined chain. Remaining evidence: database-backed browser lifecycle flows and account/membership/office/delegation revocation and expiry tests.

### Exit checks

- No authorization decision uses `accessibleLocalIds` as membership.
- Revocation tests prove immediate denial without waiting for JWT expiry.
- No roster/committee free-text identity grants an API capability.

## Phase 2 — Build the Portal adapter contract

### Work

- Define an asynchronous `PortalAdapter` contract that represents current route behavior, not a reduced new product. Keep the memory adapter as the contract implementation for unit tests/local demo.
- Inventory each method currently called through `portalStore` and map it to persisted entities. Cover Circles and membership preferences; Bulletin/comments; Actions; calendar; Binder metadata; Floor; Roll Call questions/answers; Many hands boards/columns/cards; Dispatch; One fight/momentum; Sidebars/participants/messages; search; soft deletion; mute/star/pin/order; import/export; Hall materialization; and audit references.
- Confirm the new schema has all required fields and uniqueness/ordering constraints. If a gap is found, add a forward-only migration and regenerate the boot shape; do not store a second unstructured snapshot instead of the normalized rows.
- Add adapter contract tests that run the same create/read/update/delete/search/import/export/order cases against memory and Postgres.

### Exit checks

- Every current Portal operation is represented by the adapter and has memory/Postgres parity.
- Tests cover authorization-critical membership, participant, soft-delete, and ordering semantics.

**Status:** The asynchronous contract and both adapter implementations expose the memory-store operation surface. Memory contract tests and the expanded live Portal durability smoke pass. Full operation-by-operation Postgres parity, transaction rollback/error behavior, and legacy-upgrade behavior remain to be proven.

### Concrete call-surface inventory

Use the existing `MemoryPortalAdapter` methods as the behavioral inventory and require an explicit implementation or documented non-persistence disposition for each:

- **Circles and roster:** station listing, Circle detail/create/update/archive, Circle membership changes, invitees, Hall creation/enrollment, and front dates/listing.
- **Circle tools:** Bulletin posts/comments/pins, Actions/completion, Calendar events, Binder metadata, Floor messages, Roll Call questions/answers, Many hands boards/columns/cards, and One fight/momentum items.
- **Cross-cutting:** Dispatch list/read state, mentions that create Dispatch items, search, soft deletion, Circle audit history, activity-pack export, Basecamp row/CSV imports, and roster invitations.
- **Sidebars:** thread creation, direct participant membership, message list/send, and ordering/visibility preferences.
- **Membership preferences:** mute, per-tool mute, star, pin, and role/order behavior represented by current `CircleMembership` and station/detail payloads.

Convert the current callers in `/api/portal/station`, `/circles`, `/circles/[id]`, `/circles/[id]/invitees`, `/dispatch`, `/fronts`, `/search`, `/sidebars`, and `/hall/ensure`, plus `src/lib/portal/hall-roster.ts`. Search for direct `portalStore` imports after conversion; production routes must use the selector, while fixtures may use the memory implementation directly.

## Phase 3 — Implement Postgres Portal persistence and RLS use

### Work

- Implement the Postgres adapter using Drizzle and the existing normalized Portal schema.
- Convert Portal route callers to await the adapter contract. Keep current route URLs and compatible response shapes.
- Wrap reads/writes in explicit RLS contexts. Circle content requires same-union membership and the intended Circle relationship; Sidebar data requires direct participation. Every write needs a `WITH CHECK` policy and API authorization.
- Add transactions for Circle+template creation, Circle/member changes, mention Dispatch creation, import, and central audit writes. Keep audit tied to the central audit log and optional Circle reference.
- Implement `PORTAL_DB_BACKEND` selection. Report effective backend through health/persistence status and show the memory warning only when memory is active.
- Materialize Hall membership on active local membership and revoke local-scoped Hall access when membership ends. Keep invited and union-scoped Circles explicitly membership-based.
- Keep Binder binary upload/object storage and scanning out of this phase; persist current note/link/file metadata only.

### Required transaction and policy review

- Make Circle creation plus its default board/template setup atomic, including creator membership and central audit.
- Make Circle membership changes plus local Hall synchronization atomic where both are database-backed.
- Make a post/comment mention and its Dispatch records atomic; do the same for imports and any batch mutation.
- Before adapter completion, walk each table and operation against its RLS policy. Confirm parent-derived Circle access for every child table, direct participant checks for Sidebar rows, and `WITH CHECK` enforcement for inserts/updates. Exercise API checks and RLS checks independently.
- Use the effective actor’s union/local/user/MFA context for every transaction. Do not let the adapter infer an unrestricted context from missing local information.

### Blocker order

1. **Contract parity:** the live smoke now verifies high-risk operations and atomic rollback, but add Postgres parity for the remaining memory methods before calling the adapters behaviorally equivalent.
2. **Upgrade evidence:** run the `0039`-era legacy fixture through the combined migration tail `0052`. The standalone process-restart check passes for Circle tools, membership, Dispatch, and Sidebar on the pre-rebase feature chain; extend upgrade-fixture assertions to all supported Portal record families.
3. **Fixture cleanup:** Portal desktop/mobile tests now use Local 7 and pass. Audit the remaining suite for stale local assumptions as adjacent browser coverage is expanded; do not weaken authorization to make a fixture pass.
4. **Cutover blocker:** runtime memory records cannot be reconstructed from migrations. Export activity operators need, seed demo Circles idempotently, verify restore/rollback behavior, then explicitly set `PORTAL_DB_BACKEND=postgres` during a staged deployment.

The missing environment and cutover proof do not prevent finishing CI adapter tests, RLS review, or later authorization work. They do prevent claiming live acceptance or enabling production persistence.

### Exit checks

- A full Portal workflow survives process restart on Postgres.
- Cross-union, unrelated Circle, and non-participant Sidebar reads/writes fail at both API and RLS layers.
- Mention/Dispatch and Circle/template writes are atomic.
- Health reports the effective backend correctly; memory warnings match it.

**Status:** Routes resolve through the backend selector and pass a server-derived RLS scope; Postgres operations wrap in `withRlsContext`. Live `db:rls-smoke` and expanded `db:portal-durability-smoke` passed on a seeded disposable database through the pre-rebase archive-access migration as `unionops_app`. The RLS smoke verifies active same-local committee membership and denies wrong-local links and missing-local visibility. Portal smoke covers Hall enrollment, Circle/tool writes, Dispatch/read state, imports, preferences, search, soft deletion, audit, Sidebar participant/uniqueness behavior, Circle archival, reconnect, and rollback for forced failures in key compound writes. The standalone process-restart smoke also passed. Rerun the gates on the combined chain. Full adapter parity, broader per-table denial coverage, and a legacy upgrade fixture remain open.

### Remaining Portal blockers and work order

The Portal track has both locally completable parity work and external cutover dependencies. Keep them as separate exit criteria:

1. **Finish parity locally:** enumerate every `MemoryPortalAdapter` operation against the Postgres adapter; add missing contract cases. The smoke covers rollback for Circle bootstrap, mention/Dispatch, and import; retain these regressions and add failure-path checks for other compound writes. Pay particular attention to invitation/roster operations, membership preferences, exports/imports, deleted rows, ordering, and Hall revocation.
2. **Prove RLS independently:** for each Circle child and Sidebar table, test API denial and direct restricted-role SQL denial. Preserve legitimate same-union Circle relationships while denying cross-union and unrelated Sidebar access.
3. **Prove upgrade:** obtain a representative `0039`-era fixture and migrate it through the current tail. A standalone app stop/start smoke now proves process durability for Circle tool records, Circle membership, Dispatch, and Sidebar messages; extend upgrade-fixture checks across all retained legacy and Portal record families.
4. **Prepare cutover without switching defaults:** document exports operators need to preserve from the current memory instance, verify idempotent demo seeding and restore/rollback, and stage the deployment with `PORTAL_DB_BACKEND=postgres` only after data-owner sign-off.

**External cutover blocker:** production memory data cannot be recovered from migrations. An operator must decide which activity-pack/CSV exports to preserve and authorize a staged production deployment. This does not block adapter parity, upgrade-fixture work, RLS/UI coverage, or authorization changes.

## Phase 4 — Safe data transition and production cutover (blocked on operator data preservation)

### Work

- Confirm there is no migration path for runtime-only memory activity. Before cutover, export anything operators need using existing activity-pack/CSV mechanisms.
- Seed demo Circles idempotently; never duplicate memberships or Circle IDs on repeated seed runs.
- Run migrations on a fresh DB and a representative upgrade fixture with existing users, old role JSON, officer rows, committee records, grievances, attachments, and Portal seeds.
- Run the deployment gate using owner migration credentials and exercise application traffic as `unionops_app`.
- Enable `PORTAL_DB_BACKEND=postgres` only after an operator exports any memory-only Portal activity they need and a staged deploy verifies shape, RLS, health status, full server restart durability, and rollback compatibility.

### Exit checks

- Migration journal tail/hash and generated boot shape match.
- Runtime role is not owner and has no `BYPASSRLS`.
- Seed is idempotent; restart test preserves every supported Portal record type.
- Operators have a documented export and cutover runbook.

**Current state:** `PORTAL_DB_BACKEND` remains opt-in and memory remains the deployment default until the operator confirms data preservation. Do not treat the successful disposable smoke as authorization to switch a running host.

## Phase 5 — Finish cross-feature capability adoption

### Work

Move features in bounded groups. For each feature, document ownership/participant rules before replacing legacy helpers:

1. **Core organizational surfaces:** officers, committees, elections, minutes.
2. **Casework/collaboration:** tasks, discussions, check-ins, informal logs, handoff, hybrid.
3. **Operational/financial:** ledger, expenses, travel, time.
4. **Records/reporting:** meetings, documents, reports, polls.

For each feature:

- Resolve a current actor from server-side relationships.
- Require a valid tenant and local context; missing local denies.
- Check module enablement.
- Preserve resource ownership and existing explicit participants/assignees.
- Give administrators only the feature's documented configuration or aggregate capability.
- Make UI controls use the server's effective capability response.
- Add wrong-union, wrong-local, missing-local, inactive membership, revoked relationship, and IDOR tests.

**Immediate order:** first close missing-local query and direct-ID fail-open behavior in bounded feature groups, keeping each feature's explicit cross-local capability and owner/assignee path. Then migrate those same routes from role compatibility checks to resolved actor capabilities. Do not batch-edit `!localId` conditions without reading each resource's ownership and participant semantics.

Do not invent one polymorphic participant table. Record resources needing a first-class participant relationship as follow-up work.

### Exit checks

- `canCrossLocalGrievance`/global elevated-role compatibility helpers are no longer the final authority for these routes.
- Each feature has at least one direct denial test per scope boundary and a preserved owner/assignee path.

**Progress:** The absent-local query and direct-ID failures are now closed for the feature group above, including Hub bylaws/proposals casework after reviewing their module contract. Normalized committee account linking and current migration `0051` were live-validated on a restricted runtime role before the upstream migration rebase. Reverify in the combined chain, then continue with policy consolidation, administrator capability narrowing, and feature-by-feature actor resolution; legacy role arrays still determine many non-grievance grants.

**Committee caveat:** `committee_memberships` now represents membership in the roster. It is not an API authorization grant. The current committee read/write gate remains on the legacy role compatibility path until the feature is converted to resolved `officers.manage` capability decisions.

**Additional casework protection:** CA snippets now use the resolved actor for local membership checks on list, detail, create, update, and delete. A local officer can still read union-wide reference snippets, but cannot change a union-wide or another local's entry.

## Phase 6 — Finish grievance/member experience and security tests

### Work

- Add a registered-member selector to grievance creation while retaining pseudonym-only cases; expose privacy mode and initial case-worker selection in that flow. The API already accepts member and privacy fields, but `NewGrievanceForm` does not expose them.
- Keep the existing grievance access panel and `/portal/my-cases`; verify the panel explains the granting relationship, access level, office/assignment/delegation source, expiry, and restricted indicator without disclosing a restriction reason to unauthorized users.
- Verify end-to-end publishing/withdrawal of member updates and sharing/withdrawal of member-safe attachments. The APIs and controls exist; cover current persistence behavior and ensure withdrawn material disappears immediately.
- Add exhaustive standard/restricted access matrix tests, member DTO allowlist tests, withdrawn content tests, attachment scan/share tests, break-glass MFA/reason/expiry/audit tests, and immediate revocation tests.
- Add browser coverage for member-safe My Cases, grievance creation with a registered member and restricted privacy, participant management, published updates/shared attachments, role management, delegation expiry/revocation, keyboard operation, mobile layout, and axe checks.

### Exit checks

- Restricted case content is returned only to the grievance officer and assigned case team.
- Member views contain only allowlisted fields and active published/shared material.
- Every sensitive route has backend enforcement even when its control is hidden.

## Phase 7 — Final verification and documentation

Run the following in order against the completed branch:

1. `npm run db:check` and generated shape verification.
2. Fresh migration and representative `0039` upgrade-fixture migration through the current journal tail.
3. `npm run db:rls-smoke`, Portal durability smoke, and standalone process-restart smoke using the restricted runtime role.
4. Adapter contract suites for memory and Postgres.
5. Authorization/privacy unit and route suites.
6. `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:smoke`, and `npm run build`.
7. Review every smoke failure against the declared seed/locale/module fixture before classifying it as a regression or fixture drift.
8. Update RBAC, Compliance, DATA_MODELS, LOCAL_PORTAL, deployment guidance, Progress, and the bilingual What's New entry.

## Open policy questions for the next implementation pass

- **Committee visibility:** should a normalized committee member be able to read that committee's roster, or is member status only an administrative roster relationship? The current API is officer/admin gated, and `committee_memberships` does not itself grant access. Decide this before replacing the remaining legacy committee gate.
- **Committee history:** when a local membership ends, should the committee link be removed immediately, or retained as historical roster data with effective dates? The current link has no term fields, so the UI should not imply that an inactive membership is current service.
- **Portal cutover:** which runtime-only Circle activity must be preserved through exports before an operator authorizes the staged Postgres switch? No migration can reconstruct memory-only records after restart.
- **Local-scoped access for administrators:** confirm feature-by-feature whether union/division administrators need configuration, summary, or content access. The remaining role conversion must not infer case access from rank alone.
- **Production verification ownership:** identify who can provide the representative legacy upgrade fixture, production-safe export window, and rollback sign-off. These are external gates; they do not block local adapter parity or RLS tests.

## Acceptance criteria

- No cross-union reads/writes; missing local context cannot expand access.
- Relationship revocation takes effect immediately on Postgres-backed requests.
- Restricted grievances expose case content only to their selected case team and grievance officer; involved members receive only the allowlisted projection.
- Admin roles grant only scoped admin/configuration/aggregate access; break-glass is exact-resource, MFA-protected, reasoned, time-limited, and audited.
- All current Portal record types persist through restart with API and RLS authorization aligned.
- Memory and Postgres adapters pass the same contract tests.
- A production deploy verifies the exact migration tail and generated shape before serving, using the restricted runtime role.

## Separate follow-up scope

- Binder binary storage, object storage, and virus scanning.
- Retention automation and formal privacy access/deletion workflows.
- Legacy role and JSON scope removal after compatibility telemetry.
- Resource-specific participant models for bumping and other sensitive casework.
- Portal email ingestion, digests, and real-time Floor updates.
- Broader classification review for finance, elections, and meeting records.
