# Members Portal Authorization and Persistence Remediation — 2026-09-20

## 1. Findings validated from the previous review

- Before this change, account roles and `users.local_id` were doing work that belongs to durable local membership and term-bounded office relationships. `accessible_local_ids` was also used as if it were an authorization grant.
- Officer roster rows were not a reliable account-to-authority link. Committee roster identity and user authority were separate concerns.
- Grievance records lacked a registered member relationship, privacy mode, participant list, member-safe publication stream, and per-file member-sharing record. The assigned steward was the only normalized case-team relationship.
- Grievance authorization was broader than the intended privacy rules: leadership and administrative roles could inherit case content access through broad role checks. Some calls did not consistently set RLS context, child tables did not inherit parent access safely, and a missing local could behave as an unrestricted scope.
- Grievance module/MFA checks, administrative metadata access, member-safe Portal projections, Circle membership, and case participation were separate policies rather than one consistent relationship model.
- Portal routes resolve through an async adapter selector with a Postgres implementation for the memory adapter’s current operation surface. Fresh-database migrations, RLS smoke, Portal durability smoke, and a standalone app process-restart smoke passed on the feature-only chain as the restricted runtime role. Upstream `main` added migration `0040_data_workbench` during this work; the authorization chain now starts at `0041` and ends at `0052`. The combined chain still needs fresh-database/CI verification; production cutover, full adapter parity, and legacy-upgrade acceptance remain separate gates.

## 2. Findings changed or rejected

- Grievances are a useful reference domain, but the old implementation is not a safe pattern to copy. It had to be hardened first.
- Vice-presidents receive the same standard local authority as presidents. A dual-role account retains authority from its valid office assignment; unrelated roles do not erase it.
- Restricted cases suppress president, vice-president, executive, and administrator defaults. A case participant or grievance officer can still receive access under the case policy.
- Union/division administrators receive feature-specific configuration and aggregate metadata access, not grievance content. A platform administrator gets operational metadata; grievance content needs a reasoned, exact-case, 30-minute break-glass grant.
- Hybrid `replace` imports no longer delete cases absent from the device snapshot and cannot change existing case ownership, assignment, or privacy fields.
- The Portal schema and RLS are implemented through current migration `0052`. The async adapter, Postgres implementation, route conversion, and backend selector were live-verified against an isolated database using the feature-only chain before rebase (whose archive migration was then tagged `0051`). Full application-process restart persistence was verified for Circle tool rows, membership, Dispatch, and Sidebar messages. The combined chain, a representative legacy upgrade, and production data cutover remain unverified.

## 3. Authorization model adopted

- A server-resolved actor contains active account state, union and local membership, canonical office assignments, scoped delegations, MFA state, and Circle membership context.
- Postgres-backed actor relationships are loaded from current rows, and the session version is checked so revoked membership, office, or delegation grants can invalidate an existing session.
- Local membership is required for local-scoped authority. `accessible_local_ids` remains a context-switch compatibility value and is not used as a relationship grant.
- Grievance access is evaluated in this order: active account and same union, local membership, member-safe ownership, explicit participant and access level, assigned case worker, grievance officer, standard-case local leadership, standard-case executive summary, valid delegation, then narrowly scoped break-glass. Restricted privacy blocks default leadership, executive, and delegation access.
- Feature capabilities are typed and return a reason/relationship. Feature ownership rules remain in the domain policy. Frontend controls use API-returned permission state; all writes remain server-authorized.

## 4. Backend changes

- Added `src/lib/authorization/*` for actor, capability, decision, and legacy compatibility behavior.
- Added current actor resolution and actor-derived RLS context, including user ID and MFA state. `0043` removes the missing-local wildcard from local-scoped RLS.
- Added organization APIs for membership, office assignment, delegation, and effective-access summaries. Membership activation/revocation syncs Hall access and updates the account session version. Revocation removes the local from compatibility context and clears a revoked primary local.
- Switched invite management list/create gates to current actor capabilities. A local president without active local context can no longer get an unscoped union invite list. Existing Postgres invite acceptance verifies the same-union account password, rejects cross-union/locked accounts, preserves the password, and records normalized membership/office assignment.
- Added grievance privacy/participant/member-update/attachment-share behavior; list/detail routes use the grievance policy, inaccessible IDs return 404, case creation and participants are written in one RLS context, and restricted/participant changes are audited.
- Added Portal-only `/api/portal/my-cases` DTOs and allowlisted attachment downloads. Internal notes, raw events, internal communications, settlement terms, participant identities, and unshared files are excluded.
- Added the async `PortalAdapter` contract and Postgres implementation for every operation exposed by the memory store. Portal APIs and Hall enrollment now resolve through the selector with server-derived RLS scope. `PORTAL_DB_BACKEND` is included in health; the memory warning follows its effective value.
- Added migrations `0047`–`0050` after live testing exposed `INSERT ... RETURNING` read-policy gaps during Circle, initial roster, and Sidebar creation. The final rules allow only same-union Circle creators to read their bootstrap rows and only a union-scoped Sidebar creator to read the thread before participant rows exist.
- Updated the durable Compose overlay to expose `PORTAL_DB_BACKEND` while keeping it opt-in as memory until an operator preserves runtime-only activity; the production env example and CapRover guide describe the staged cutover.
- Memory/demo mode no longer crashes when the database-only participant, member-update, and attachment-share APIs are opened: read endpoints return safe empty/legacy state and writes fail with 503; the UI explains the durable-storage dependency. Grievance privacy-mode changes remain supported by the existing grievance adapter.
- Added exact-resource platform break-glass functions/API with MFA, reason, expiry, and audit; there is no grievance list/search path for the platform role.
- Hardened the calendar aggregation so it resolves grievance relationships and omits summary-only/restricted case meetings.
- Centralized the legacy cross-local/elevated role helper imports. Most non-grievance features still need a full actor/capability conversion; the compatibility wrapper is transitional, not the final shared-policy rollout.
- Added a shared unmatched-local query filter and corrected missing-local list/direct-ID access in elections, check-ins, discussions, informal logs, expenses, polls, ledger, minutes, travel, tasks, committees, officer records, meetings, bumping, time, bylaws, and proposals. Existing same-union owner/assignee/requester paths were retained where the domain models them. Legacy role arrays and broad administrator grants remain a separate migration item.
- Hardened CA snippet routes after finding same-union direct-ID reads and writes ignored local scope. Local list/detail/create/update/delete now require a matching active membership; local officers cannot assign a snippet to a different local or manage union-wide shared entries.
- Durable actor resolution now refreshes the effective local and bargaining unit from the current membership row, so an ended/changed relationship does not survive through stale session scope.
- Normalized committee membership now uses `committee_memberships`, with a same-union/local composite parent FK, active same-local account validation, transactional Postgres synchronization, explicit actor/MFA RLS context, and a picker fed by active local memberships. Legacy `memberOfficerIds` remain display references; current migration `0041` safely backfills resolvable old roster links, and new links require selecting an active account. Migration `0051` and its generated shape are included; its pre-rebase RLS smoke must be repeated against the combined chain.
- Memory-mode committee APIs reject account-linked writes with 503 because they cannot validate active local membership; the legacy roster-reference workflow remains available there.

## 5. Frontend/UI changes

- Added organization management UI for memberships, canonical offices, delegations, and the current user's effective authority explanations.
- Added grievance access/privacy panel, case participants and levels, member-safe update publishing, attachment sharing, and `/portal/my-cases`.
- Portal Circle creation UI now reads the effective create/scope capabilities from its server API, so a local president cannot see a union-wide scope switch they cannot use.
- Added Portal navigation and English/French text, including a What's New entry.
- Organization management now displays account state, allows primary-local changes, captures office term dates, offers account linking for local roster entries, and identifies unlinked display-only rows. Unresolved roster entries still grant no authority.
- Committee management now selects active local member accounts by name and keeps legacy officer IDs in a separately labeled display-reference field. EN/FR copy distinguishes the two relationships.
- Grievance creation has not yet gained the planned registered-member selector and privacy/participant setup flow. Mobile/axe/browser flows still need end-to-end coverage.

## 6. Database or migration changes

- Added forward-only authorization/Portal migrations `0041`–`0052` after preserving upstream `0040_data_workbench`: local memberships, office assignments, delegations, roster/committee links, grievance privacy/participants/member updates/attachment shares/break-glass, normalized Portal tables, RLS hardening, guarded self-preference writes, transactional Dispatch creation, author-bound Sidebar messages, narrowly scoped bootstrap reads required by `INSERT ... RETURNING`, committee membership scope enforcement, and archived Circle access denial.
- Backfills derive primary local membership from `users.local_id`, non-admin additional local memberships from `accessible_local_ids`, and initial office assignments from legacy roles. Administrator-wide switch scopes are not backfilled as memberships.
- Updated Drizzle schema exports, merged the migration journal, RLS contract, and generated database shape. The journal now has 53 indexed entries, and the generated shape declares 104 tables and 98 policies; run `db:check` and fresh migration gates in CI because these files changed during rebase.
- Before rebase, fresh isolated Postgres migration and seed passed through the feature-only archive migration (then `0051`); deploy verification reported 94 tables, 993 columns, and 88 policies. Both RLS smoke and expanded Portal durability smoke passed as `unionops_app`. RLS smoke covers grievance scope and normalized committee same-local linking, with wrong-local and missing-local denials. Portal smoke covers Hall enrollment, Circle/template creation, Portal tool writes, Dispatch/read state, imports, preferences, search, soft deletion, audit, Sidebar uniqueness/participation, archival, client reconnect persistence, and rollback after forced failures in Circle setup, mention/Dispatch, and imports. A separate standalone app stop/start smoke verifies Circle tool rows, membership, Dispatch, and Sidebar messages survive a real process restart. This pre-rebase evidence does not cover upstream Data Workbench or the combined migration chain.
- Portal runtime-only activity cannot be recovered by migration. Before any Portal Postgres cutover, preserve any needed memory-backed activity using the existing exports/imports and seed demo Circles idempotently.

## 7. Security considerations

- Member Portal grievance APIs return a distinct allowlisted projection. Member ownership never grants access to internal Hub case content.
- Restricted-case access and attachment sharing are enforced by backend relationship checks and RLS; UI visibility is secondary.
- Missing local context and cross-union identifiers fail closed. Inaccessible grievance IDs use 404 to avoid existence disclosure.
- Break-glass is scoped to the requesting platform operator, exact grievance ID, MFA-verified request, written reason, and short expiry. Function execution is separately guarded in Postgres.
- Hybrid imports cannot transfer the case team/privacy/member link; the adapter preserves those fields and replace mode does not delete absent cases.
- The async Portal adapter, Postgres implementation, API selector conversion, health flag, live migration, RLS, durability smoke, and representative process-restart path are verified on an isolated database. Do not enable production cutover until runtime-only memory data is preserved, a legacy upgrade fixture passes, full adapter parity is covered, and production configuration/rollback are staged.
- The live smoke proved runtime-role boundaries and adapter reconnect persistence, not every Portal operation’s parity or a production deployment.

## 8. Tests added or updated

- Added grievance relationship/access tests for president/vice-president parity, restricted cases, grievance-officer access, executive summaries, member-safe ownership, delegation expiry, account/membership/scope denial, and administrator denial.
- Added hybrid import adapter coverage proving server-managed member, privacy, assignment, and creator fields survive replace imports and absent cases remain.
- Updated grievance API tests for 404 privacy behavior, hybrid multi-role capability behavior, and calendar tests to ensure union administrators do not receive sensitive grievance meeting details.
- Updated the Circle cross-local smoke assertion to require a 403 for local-president scope switching; that focused Playwright test passed after the server-capability UI change.
- An earlier full unit run passed: 2,033 tests across 322 files, 1 skipped. At that checkpoint, `npm run typecheck`, `npm run db:check` (50 journal entries / 94 tables), and `npm run build` passed. Full lint had 0 errors and 1 pre-existing unused-variable warning in `src/lib/site-admin/demo-purge.ts`. The build reports the existing Edge Runtime warning from `src/lib/tenant/overlay.ts` importing Node `crypto`.
- Latest focused authorization rerun passed 16 suites / 92 tests covering absent-local list filters and direct access paths, including governance casework. Typecheck passed after the scope corrections.
- The latest complete post-change unit run passed 2,047 tests across 325 files, with 1 skipped, using two workers after PDF layout timeout noise under higher parallelism. An earlier run caught that discussion creators remain local-scoped; that existing rule is preserved and the rerun passes.
- The CA snippet route suite now passes 13 tests covering same-union wrong-local access, no-local reads, and cross-local writes. Combined snippet/scope regressions pass 20 tests; typecheck and targeted ESLint remain clean after current-membership scope resolution.
- Before rebase, a fresh disposable Postgres 16 database passed deployment through the feature-only archive migration (then tagged `0051`), idempotent seed, `db:rls-smoke`, and expanded `db:portal-durability-smoke` as `unionops_app`. Docker durable-overlay configuration and the standalone process-restart smoke also passed. The combined post-rebase chain, a representative legacy upgrade fixture, and production cutover remain unverified.
- Browser verification against a dedicated UnionOps dev server passed all 22 Portal desktop/mobile checks and all 12 existing Hub organization-surface checks; one additional membership/authority page-load check passed separately. The Portal specs were aligned to the seeded Local 7 Hall. A sticky-tab overlap covering the Many hands start button was corrected. Full organization/office/delegation write and revocation flows still need a seeded Postgres browser fixture. The first broad smoke had reused port 3000 owned by an unrelated app and its 404 results are discarded.
- Pre-rebase committee follow-up verification passed focused committee API/access/session and RLS/deploy contract suites (44 tests); EN/FR copy guards passed (38 tests); the then-current database check reported 51 entries / 94 tables; typecheck and lint passed (one existing warning), build passed with the existing Edge `crypto` warning, and the full unit suite passed 2,047 tests across 325 files (one skipped). The committee migration was then `0050`; it is `0051` after rebase. Fresh combined-chain validation and a Postgres-backed committee browser flow remain outstanding.

## 9. Remaining known gaps

- Fresh Postgres migration, RLS allow/deny behavior, Portal transaction rollback, client reconnect, and standalone process-restart persistence now pass. Full Portal adapter parity, upgrade fixture, broader per-table API/RLS denial coverage, and production cutover remain open.
- Runtime-only memory Portal records cannot be migrated automatically. Export activity that operators need before cutover; seed demo Circles idempotently and keep production on memory until the live gates pass.
- A complete cross-feature capability conversion is outstanding for tasks, discussions, check-ins, officers, committees, elections, minutes, informal logs, ledger, meetings, polls, expenses, travel, time, documents, reports, handoff, and hybrid operations. The remaining feature policies still depend on some legacy role checks.
- The missing-local wildcard has been corrected for this feature group, but explicit union/division/platform administrator access still relies on legacy role policy in several domains and needs capability-by-capability narrowing.
- CA snippets still use the legacy memory adapter and role gate for feature operations; production-grade durable storage and full typed capability integration remain follow-up work.
- Remaining role-management work includes live and browser verification of normalized committee membership, full invite/password/session revocation integration tests, membership/office lifecycle tests, and browser coverage for roster linking and delegation expiry.
- Grievance creation UI, complete access-summary display, privacy-specific member communication workflow, and full participant/list/API test matrix are incomplete. New access controls explicitly report when memory mode cannot persist participant/update/file-sharing state.
- Backfills were exercised on fresh demo seed data, and RLS/Portal durability plus selected process-restart persistence were exercised in isolated Postgres. A representative legacy upgrade fixture, live break-glass integration, broader member/officer browser flows, and production cutover are still required.

## 10. Follow-up work that should be handled separately

1. Run Postgres contract parity against the full memory contract, add a representative legacy-upgrade fixture, and preserve any production memory-only activity before cutover.
2. Complete feature-by-feature capability migration using the actor context, preserve ownership/participant rules, and add missing-local/cross-union tests per feature.
3. Add linked-roster management, invite acceptance/revocation integration tests, grievance creation member/privacy controls, and browser/keyboard/mobile/axe coverage.
4. Run the complete test/lint/build gates and fresh/upgrade/live Postgres RLS and durability smoke as the non-owner runtime role.
5. Keep Binder binary storage/virus scanning, retention/access deletion workflows, legacy role removal, and additional participant models as separate scope.

## Verification addendum — 2026-09-21

- The merged database journal now ends at `0052_portal_archive_access` (53 entries). Its generated shape declares 104 tables and 98 policies; combined-chain migration/RLS execution is still pending CI. Before rebase, the feature-only live database had 94 tables, 993 columns, and 88 policies. Archived Circle access is denied at the parent and child-policy level in the implemented policies.
- Expanded Portal durability smoke passes with the restricted `unionops_app` role, including forced transaction failures for Circle setup, mention/Dispatch creation, and imports. Each failure leaves no partial rows.
- The standalone Next process-restart smoke passes after fixing a trailing-slash login predicate that had mistaken `/en/app/login/` for a successful redirect. The smoke waits for the credentials callback and verifies an authenticated session before asserting Portal API data.
- Verified after actual app stop/start: Circle tool records, Circle membership, member Dispatch assignment, and Sidebar messages remain present. This is not evidence of a representative legacy upgrade or exhaustive adapter parity.
- Remaining local work is ordered in [the companion plan](plan-members-portal-authorization-remaining-2026-09-20.md): build and migrate the `0039`-era upgrade fixture; finish adapter parity and broader API/RLS coverage; exercise organization and grievance lifecycle flows with a Postgres-backed browser fixture; continue feature-by-feature capability conversion. Production cutover remains gated on an operator's memory-data export decision and staged rollback approval.
- The full browser smoke was stopped at the user's request; its partial result is not reported as a pass. Re-run merge-gate checks in CI after the rebase resolution.
