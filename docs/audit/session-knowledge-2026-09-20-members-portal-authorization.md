# Session knowledge — 2026-09-20 — Members Portal authorization remediation

**Scope:** shared membership/authority model, grievance privacy, member-safe case access, Portal persistence, and remaining implementation work. Companion documents: [implementation record](members-portal-authorization-review-and-remediation-2026-09-20.md) and [remaining-work plan](plan-members-portal-authorization-remaining-2026-09-20.md).

## Lessons

### L1 — Validate the prior review against code before treating it as a spec

The previous review correctly identified missing durable memberships, unreliable roster-to-account links, broad grievance access, and memory-only Portal records. A few target details needed refinement: vice-presidents should match presidents for standard local authority; restricted cases suppress leadership defaults; and local officers should not get cross-local power from `accessibleLocalIds`. Preserve the useful findings, but verify each against routes, adapters, session construction, RLS, and existing fixtures.

### L2 — Context switching is not an authorization relationship

`accessibleLocalIds` can help choose a local context, but it does not prove membership or authority in that local. Resolve current local memberships and office assignments on the server for durable accounts. Local presidents can create for their local; union-wide Circle creation needs an actual union-wide capability. UI controls must consume the same server-resolved capability decision that the API enforces.

### L3 — RLS only protects calls that actually enter its transaction context

Wrap each Postgres-backed store operation in `withRlsContext` with the right union, local, user, MFA, and cross-local values. Route helpers named differently from the generic auto-scope hooks do not inherit protection automatically. Missing local context must remain a deny condition; do not restore a null-local wildcard to make a route pass.

### L4 — Put parent-resource privacy in one policy, then use it at every entry point

Grievance list, detail, child resources, calendar aggregates, hybrid flows, and Portal projections must agree on the same relationship and privacy decisions. A hidden detail page is not sufficient if a list, export, calendar, attachment route, or child API can still expose the record. Inaccessible IDs should not reveal whether a case exists.

### L5 — Member-facing case data needs an allowlist projection

Do not serialize an internal grievance and remove fields opportunistically. Build a separate member-safe DTO from explicitly approved fields and test it against an allowlist. Internal notes, raw events, strategy, settlement terms, other participant identities, and unshared attachments stay out of Portal responses.

### L6 — Restricted privacy must override defaults, not explicit case relationships

Standard cases may use local leadership defaults and executive summaries. Restricted cases suppress those defaults. A grievance officer and explicitly assigned case participants still receive only the access granted by the case policy. General delegated authority must not silently bypass this boundary.

### L7 — Memory mode needs deliberate failure behavior for database-only features

Calling `getDb()` without a configured database throws. For controls that only persist to Postgres, make reads return safe empty/legacy state, reject writes with a clear 503, and explain the storage requirement in the UI. Do not silently claim that a memory write is durable. Keep the server authorization check even when the UI hides the control.

### L8 — Keep server-owned case security fields out of imports

Hybrid files may carry case work content, but should not take over case ownership, involved-member identity, privacy, participant grants, delegation, or break-glass state. Replace imports should not remove central records simply because they are absent from a device snapshot.

### L9 — The database boot contract includes the generated shape artifact

Migrations are forward-only and the Drizzle journal remains the upgrade ledger. Update the migration journal, Drizzle exports, RLS contract, and generated `docker/db-required-shape.json` together. `npm run db:check` verifies the repository contract; it does not prove that production boot or live RLS works. Follow [ADR-020](adr-020-database-deployment-contract.md) and [the verified deploy note](session-knowledge-2026-09-20-verified-db-deploy.md) before future migration or boot changes.

### L10 — Separate genuine product changes from stale smoke assumptions

The broad smoke run exposed Portal tests using Local 243 while the current demo seed is Local 7, along with other unrelated UI expectations. One old cross-local Circle test also encoded the access rule being removed. Update tests when the intended policy changes, but do not loosen server authorization just to satisfy a stale expectation. Record the exact run and rerun the focused changed path; do not call the whole smoke suite green from one focused pass.

### L11 — No database URL means no migration/RLS acceptance evidence

At the initial implementation checkpoint there was no `DATABASE_URL`; schema generation, typecheck, unit tests, and build passed, but no live migration, non-owner runtime role, RLS policy, revocation, or restart durability had been verified. Later disposable Postgres runs have closed some of those evidence gaps. Production cutover remains blocked on the remaining gates in the follow-up plan.

### L12 — A schema is not a persistence implementation

At the initial implementation checkpoint, migrations `0042` and `0043` defined normalized Portal tables and policies while routes still reached the synchronous in-memory `portalStore`. Closing that gap required an asynchronous adapter contract, a Postgres implementation for every existing operation, and conversion of every API/helper call site. The inventory must include less visible flows such as Hall enrollment, imports/exports, search, sidebar participation, mute/star/pin preferences, and soft deletion; implementing only Circle and Bulletin CRUD would leave data loss and authorization gaps.

### L13 — Keep one authoritative audit trail across the adapter boundary

The memory Portal adapter has a Portal-specific audit collection, while the database already has a central audit log with an optional Circle reference. The Postgres adapter should write to and read from that shared audit source in the same transaction as the Portal action. A second durable audit store would create split histories and make atomicity and investigation harder.

### L14 — Treat the current adapter’s synchronous shape as a migration constraint

Existing UI/API consumers and tests call `portalStore` synchronously. Postgres access is asynchronous and must run inside explicit `withRlsContext` transactions. Keep the in-memory adapter useful for demos and tests, but make production callers use the asynchronous contract consistently; avoid a sync facade that returns stale state or hides database failures.

### L15 — Preserve the whole Portal operation surface

The adapter contract must cover every method exposed by the memory implementation, including less common administration and compatibility paths. Route conversion alone is insufficient if a helper, import flow, Hall sync, or Sidebar operation bypasses the selector. Keep a parity inventory and test both adapters against the same contract; add database-only tests for the actual SQL and transaction behavior.

### L16 — Relationship RLS needs safe write boundaries

Circle preferences, Dispatch creation, and Sidebar conversation messages need explicit write policies. A user may update their own mute/star/pin preferences without changing identity or membership authority; Dispatch writes must validate their Circle and recipients; Sidebar messages must require participant access and actor authorship. Relationship-based Circle/Sidebar access can legitimately cross local boundaries within a union, so tests must distinguish that from cross-union access and missing-local wildcard behavior.

### L17 — `INSERT ... RETURNING` also crosses the read policy

Postgres applies the table's SELECT policy to rows returned by `INSERT ... RETURNING`. A write policy can be correct while Circle or Sidebar bootstrap fails because the creator's membership/participant row is inserted afterward. Keep bootstrap visibility narrowly bound to the same-union creator, then retain normal membership/participant checks for subsequent reads. Verify transactions against the real non-owner role; evaluating the write expression alone did not expose this.

### L18 — A disposable live database turns schema confidence into runtime evidence

The journal/shape check passed before the Portal path worked. A fresh isolated database with the deployed app role exposed the `RETURNING` gaps, and the same smoke then verified Circle tools, access denial, audit, Sidebar uniqueness, and reconnect persistence. Keep “fresh migration,” “live RLS smoke,” “reconnect,” and “server restart” as distinct claims.

### L19 — Local administration must fail closed before filtering records

The invite list helper treats an omitted local filter as union-wide. That is valid for tenant administrators but unsafe for a local president without active local context. Authorize the actor's current capability before building the list filter; do not use a missing local as a signal to widen the query. Keep a regression test for the no-local case.

### L20 — Verify the browser target before trusting a smoke result

Playwright reuses an existing local server when its base URL is already available. In this workspace, port 3000 belonged to an unrelated “Awesome Soundboard” app, so the first browser run hit 404s unrelated to UnionOps. Check the returned app identity or run the dev server and browser suite on a dedicated port before interpreting failures.

### L21 — Keep smoke fixtures aligned with the active demo seed

The Portal desktop/mobile browser suite expected Local 243 Hall links while this checkout's memory/demo seed is Local 7. The mismatch hid valid links and controls. The Portal specs now use `circle-hall-7`; the 22 desktop/mobile Portal checks pass. Align future fixtures with the seeded tenant/local or explicitly seed a different fixture before treating a failure as an authorization regression.

### L22 — Sticky controls must not sit inside an overflow clipping parent

The Circle workspace's sticky tool tabs were inside a card with `overflow-hidden`. On the empty Many hands panel, the tab bar overlapped and intercepted clicks on “Start Many hands.” Removing the clipping parent fixed the pointer interaction while preserving keyboard access; the Circle creation/board-start browser flow now passes.

### L23 — Missing-local fail-open behavior is systemic across list and detail paths

An absent active local is not equivalent to union-wide scope. Several session list-filter helpers pass `localId: undefined`, which the adapters interpret as “do not filter by local”; several record policies also treat `!localId` as permission to view any local. Fix both query filtering and resource authorization, while preserving explicit cross-local administrator capabilities and feature-specific owner/assignee relationships. Add paired list and detail regressions so a fix in one layer cannot leave the other open.

**Applied in this session:** the shared unmatched-local filter and direct policy changes now cover elections, check-ins, discussions, informal logs, expenses, polls, ledger, minutes, travel, tasks, committees, officers, meetings, bumping, time, bylaws, and proposals. CA snippets also now require active local membership for local-scoped reads and writes, including direct-ID paths. Owner/assignee/worker/submitter/requester access remains only where the feature already models that relationship; check-ins and discussions stay local-scoped apart from their existing solo-account rule.

### L24 — Make scoped-query denial explicit and consistent

Where a feature's existing adapter has no “deny all” filter, use a deliberately unmatched local sentinel for a non-cross-local actor with no active local. Keep the cross-local omission behavior behind an explicit capability. Do not rely on a route's list filter alone: direct-ID checks must also deny unrelated local records, and owner/participant exceptions must be narrowly preserved.

### L25 — Separate code-completable work from operator-controlled cutover

Lack of production data export, credentials, and a staged deployment blocks the final Portal backend flip, but it does not block completing adapter parity tests, migration fixtures, authorization checks, or runbook preparation. Keep `PORTAL_DB_BACKEND` opt-in and record the exact external evidence needed for cutover instead of treating the whole Portal track as blocked.

### L26 — Preserve only ownership paths the feature actually defines

Do not create a cross-local creator exception just because a row has `createdById`. Discussion threads and check-in schedules remain local-scoped for ordinary Hub roles; the existing compatibility test caught an accidental expansion. Preserve assignee, worker, submitter, or requester access only where the feature's policy and user workflow already define it.

### L27 — Same-union IDs still need local checks on every operation

Union equality is not enough for local-scoped records. CA snippet detail routes originally checked union but not local for direct reads, edits, and deletes, even though list queries were local-filtered. Enforce the resolved actor's active local membership at list, detail, create, update, and delete boundaries; keep union-wide shared entries read-only for local officers.

### L28 — Refresh active local and bargaining-unit scope from durable membership

An actor that reloads current memberships should derive its active local and bargaining unit from the matching current membership row. Keeping those two fields from a JWT/session snapshot can leave stale group scope in downstream feature filters after a transfer. If the selected local is no longer active, clear the effective local instead of silently substituting a different membership.

### L29 — Keep normalized committee members separate from roster labels

Legacy `memberOfficerIds` are display references, not user identities or authority. Resolve linked accounts only through the officer roster's same-union/local link, and store durable committee members in `committee_memberships`. Validate every selected account against a current active membership and account state, then enforce the same relationship in RLS and a composite committee-scope foreign key. The route must pass `current_user_id` into RLS; a tenant-only store wrapper can overwrite the actor context. The UI should name linked accounts and clearly label unresolved roster references as legacy display data.

The normalized committee-member link currently describes who is on the roster; it does not grant access to the committee API. The API gate still uses legacy role helpers, so migrate that gate to the shared capability resolver before treating committee access as consistent with normalized offices. Memory mode cannot prove current membership, so it must reject account-linked writes with a clear 503 while retaining legacy display-only edits.

### L30 — Verify the latest journal tail with the restricted runtime role

Repository shape checks do not exercise actual RLS. A disposable PostgreSQL 16 database with separate migration-owner and `unionops_app` credentials verified the current `0051_committee_membership_scope` tail, seed, committee same-local member link, wrong-local link denial, and missing-local read denial. Keep the owner URL for migrations and fixture cleanup only; application smoke traffic must use `unionops_app`, with no owner or `BYPASSRLS` privileges. Never reuse the saved base-project database as a disposable fixture.

### L31 — A durability smoke is not a process-restart test

The expanded Portal smoke now exercises Hall enrollment, Circle creation and access boundaries, tool writes, Dispatch/read state, imports, preferences, search, audit, soft deletion, Sidebars, and Circle archival. Resetting the database client and reconnecting proves rows outlive a client connection; it does not prove application restart, all-operation adapter parity, rollback behavior, or an upgrade from a representative legacy database. Keep those as separate acceptance gates.

### L32 — Treat data preservation and engineering readiness as separate blockers

All code-completable persistence, RLS, contract, and authorization work should proceed while production stays on memory mode. Runtime-only memory activity cannot be recovered from schema migrations. The deployment owner must identify and export any activity worth preserving, approve a staged Postgres rollout, and verify restore/rollback before changing the production backend setting.

### L33 — Normalize locale routes and verify the authenticated session in browser smokes

The standalone restart smoke initially treated `/en/app/login/` as a successful post-login route because its predicate only excluded paths ending in `/login`. It did not prove that credentials were submitted, then read a valid `200` session response whose JSON was `null`. Normalize trailing slashes before comparing routes, wait for the login page to hydrate, observe the credentials callback, and require an authenticated session user before calling any Portal API. The corrected smoke now stops and starts the standalone Next process and confirms Circle tools, membership, Dispatch, and Sidebar data survive the process restart as `unionops_app`.

### L34 — Merge substantial work to `main` in smaller completed milestones

This authorization and persistence pass accumulated a broad uncommitted change set across migrations, adapters, routes, UI, tests, and documentation. Before continuing with remaining blockers, commit and merge the verified milestone, then keep future work in smaller reviewable increments. This keeps the main branch current and makes regressions easier to locate. Preserve the remaining-work plan as the handoff between milestones.

### L35 — Re-read the upstream migration journal before adding a migration series

This branch was based on a `main` revision where the journal ended at `0039`. While the branch was being prepared, upstream `main` added `0040_data_workbench`; this feature had independently added `0040_org_membership_authority`. Rebasing exposed the collision. Preserve the upstream migration, move the feature chain forward to `0041`–`0052`, merge both journal histories by index, and update every RLS-contract, test, schema-shape, and documentation reference. The existing disposable database evidence came from the pre-rebase chain, so it does not verify the new combined chain or its added Data Workbench tables. Before creating append-only migrations, refresh `main` and inspect its journal; rebase early, reserve unique tags, then rerun the fresh-chain DB gates in CI before calling the combined schema verified.

## Shipped in this session

- Forward-only schema and RLS changes in migrations `0041`–`0052` after preserving upstream migration `0040_data_workbench`.
- Shared actor/capability resolution and organization APIs/UI.
- Grievance privacy/participant access, member-safe Portal case projection, exact-resource break-glass, and hybrid safeguards.
- Server-driven Circle creation capabilities and a focused test proving a local president cannot switch into union-wide authority.
- Async Portal adapter contract, Postgres adapter, Portal route/Hall-selector conversion, backend health setting, and an effective-backend memory warning.
- Migration `0044` write-policy completion for Circle preferences, Dispatch, and Sidebar messages.
- Migrations `0046`–`0049` narrow Circle, roster, and Sidebar creator reads required by `INSERT ... RETURNING`, with RLS contract coverage.
- Invite management now gates on current actor capabilities, and organization UI includes account-state visibility, primary-local changes, office terms, roster linking, and unlinked-entry warnings.
- Portal desktop/mobile smoke now matches the Local 7 memory seed; Circle creation and Many hands startup are browser-verified after removing the sticky-tab overlap. Twenty-two Portal checks pass, along with the existing 12 Hub organization surface checks and a new organization-manager page-load check.
- Earlier live checkpoint: the pre-rebase feature chain passed fresh Postgres deploy, seed, RLS, and Portal durability checks as `unionops_app`, before upstream `0040_data_workbench` was incorporated. Those results remain useful for feature behavior, but do not verify the combined chain.
- Final local gates: 2,033 unit tests passed across 322 files (1 skipped); typecheck, build, lint, DB shape check, and durable Docker Compose config validation passed. Lint has one existing unused-variable warning in `site-admin/demo-purge.ts`; build has the existing Edge `crypto` warning.
- After the missing-local, snippet, actor-scope, committee-link, and memory-mode boundary changes, the latest full unit suite passed 2,047 tests across 325 files (1 skipped). It used two workers after PDF layout tests hit timeouts under parallel load. The earlier strict-local discussion finding remains covered and green.
- A full organization write-flow browser test still needs a seeded Postgres app fixture because membership, officer, and delegation APIs intentionally return 503 in memory mode.
- The bounded missing-local pass now covers list and direct-ID paths in the features listed above, with 16 focused suites / 92 tests and typecheck passing. Cross-feature capability adoption and narrowing legacy administrator access remain incomplete.
- Current migration `0051` (the pre-rebase `0050`) binds normalized committee-member rows to their parent committee scope and active same-local accounts. The Postgres adapter reads/writes those links transactionally and validates current membership/account state. Legacy IDs are display references only; the migration retains its safe backfill for resolvable old roster links, while new user links come from the account picker. Committee routes carry user/MFA scope into RLS. Focused pre-rebase committee/RLS tests and live policy execution passed; rerun the combined-chain DB gate in CI. Database-backed browser flows remain open.
- CA snippet routes now fail closed for missing local context, wrong-local direct IDs, and local-officer writes targeting another local; the 13-route-test suite passes.
- Latest pre-rebase disposable Postgres 16 verification: the feature chain reached its then-current committee/archive migrations with 94 tables, 993 columns, and 88 policies; seed, RLS, Portal durability, and a standalone app-process restart passed using `unionops_app`. The RLS smoke verified same-local committee linking and denied wrong-local links and missing-local visibility. These results do not cover the post-rebase 104-table/98-policy generated contract, full adapter parity, or a legacy upgrade fixture.
- The latest authorization pass found a broader missing-local fail-open pattern in list filters and detail access policies beyond Committees and Invitations; complete the bounded feature pass and add paired regression tests before marking cross-feature authorization consistent.

## Not shipped

- Combined post-rebase migration/RLS verification, legacy upgrade-fixture validation, full contract parity against Postgres, and production data cutover. The standalone process-restart check passed against the pre-rebase feature chain.
- Complete actor/capability conversion across the remaining Members Portal features.
- Browser coverage for normalized committee user links and several grievance/member UI flows, including complete publication/share controls and browser accessibility coverage. Live RLS policy execution for current migration `0051` was covered on the pre-rebase feature chain.
- Browser coverage for database-backed membership, officer, and delegation writes/revocation; the manager page itself now has smoke coverage.

Use the [remaining-work plan](plan-members-portal-authorization-remaining-2026-09-20.md) for remaining work. Live isolated smoke evidence does not itself authorize a production persistence cutover.

## Verification update — 2026-09-21

- The merged journal now has 53 entries and ends at `0052_portal_archive_access`. The generated contract includes 104 tables and 98 policies after preserving upstream Data Workbench migration `0040`; those combined migration/RLS counts are not live-verified yet. Before rebase, the feature-only database had 94 tables and 88 policies. The archive-access migration ensures archived Circles and their child content are no longer visible to members.
- `db:portal-durability-smoke` now forces failures during Circle setup, mention/Dispatch, and imports and confirms the transaction leaves no partial rows.
- The standalone process-restart smoke now passes after correcting its trailing-slash login predicate and adding session verification. It confirms the seeded Circle tool records, membership, member Dispatch assignment, and Sidebar message remain available after an actual Next process restart.
- Remaining local engineering blockers are the representative `0039` upgrade fixture, complete Postgres-versus-memory adapter parity, broader API/RLS coverage, and the organization/grievance browser lifecycle flows. Cross-feature capability migration also remains.
- Production cutover remains an external operator/data-preservation gate. The process-restart result uses a disposable database and does not authorize changing the production backend.
- The Playwright browser run that was still in progress was stopped at the user's request. Do not report its incomplete result as passing; CI should provide fresh merge-gate evidence after the resolved rebase.
