# Union customization: implementation handoff

**Status:** C01–C05 implemented; C06 next. C06–C15 pending. Verification is recorded in PROGRESS.md.

**Design authority:** [UNION_CUSTOMIZATION.md](../modules/UNION_CUSTOMIZATION.md).
**Baseline reviewed:** `1f68490`, 2026-09-22. Recheck the checkout before implementing.

## 1. Instructions for the implementing model

Execution record: C01 inventory and local regression baseline are in [conversion inventory](union-customization-conversion-inventory.md). C02's typed schemas and pure resolver are implemented in `src/lib/customization/`; its [README](../../src/lib/customization/README.md) documents safe calling boundaries. Production authorization, SQL/RLS, publishing and UI remain later tasks. Per the execution directive, make local atomic commits and defer GitHub Actions E2E until modular implementation is complete.

Implement one task below at a time, in dependency order. Read the design before editing. For pending tasks, routes, tables, feature flags and files labeled proposed are to be created; inspect the current code before re-creating anything from completed C01–C02. Keep each change reviewable. Do not implement billing, scrape OPSEU, rewrite all guides, merge Brand Kit identities into Hub tenancy, or broaden casework permissions as collateral work.

Read `AGENTS.md`, VISION, ARCHITECTURE, RBAC, COMPLIANCE, current-ground-truth, then the specific sources listed for the task. Read ADR-020 and verified-db-deploy lessons before schema work; task-first-public-site lessons and public navigation/SEO/i18n rules before route/catalog work. Read Canvas Core documentation before any actual canvas integration; this plan does not authorize a capture engine redesign. Read the grievance module and hybrid contract before workflow integration. Existing source code outranks stale phase status tables.

Preserve unrelated working-tree changes. Use repository adapters, `@/` imports, Zod validation, current account checks, explicit RLS transactions, bilingual UI, and existing status/error chrome. New runtime content lives in DB payloads; UI labels stay in EN/FR messages. Do not use `dangerouslySetInnerHTML`. No external CMS dependency or analytics.

Before each task, state its acceptance gate; after it, report files changed, exact verification commands/results, and unresolved gaps. Do not mark a phase complete because types compile. Root-only, tenant isolation and private-byte exclusion require negative tests.

## 2. Requirement traceability

| Requested output | Design section | Execution tasks |
|---|---|---|
| Hierarchical architectural resolution | 2–3 | C01, C02, C05, C08 |
| Root and delegated RBAC | 4 | C03, C07, C13, C14 |
| Schema, revisions, drafts, fallback | 5 | C02, C04, C05, C06 |
| Public/member/officer and section visibility | 6 | C03, C06, C09, C10 |
| Empty state and post-launch OPSEU population | 1, 9 | C07, C11, seeding runbook |
| Workflow/tool customization | 7 | C08, C12 |
| Risks, performance and operations | 8 | C04, C06, C10, C15 |

## 3. Delivery ordering and phase gates

```text
Phase 1: C01 → C02 → C03 → C04 → C05 → C06 → C07 → C08
Phase 2: C09 → C10 → C11 → C12
Phase 3: C13 → C14 → C15
```

This order is deliberately serial for a less capable model. Schema/security contracts precede UI. C09's broader toggle UX must not be used to defer Phase 1 server authorization. A Phase 1 deployment is allowed with no real union content. C12 may ship as a separate follow-up within Phase 2, but workflow customization must remain visibly unsupported until its gate passes.

Suggested PR boundaries: C01–C02 contracts; C03–C04 persistence/security; C05–C06 publication; C07–C08 pilot UI/integration; C09–C10 visibility; C11 content-operation documentation; C12 workflows; C13 grants; C14 local parameters; C15 entitlements/operational validation. Split further if a diff obscures security review. Follow repository PR/CI policy when publishing changes; do not carry an unverified migration into a UI PR.

### Phase 1: Core engine, fallback, Root control panel

#### C01 — Inventory and compatibility manifest

**Read:** tenant loader/schema; authorization model/actor; public-tools adapter/store; brand registry; source registry; public catalog; SEO route map; `src/lib/data/adapter.ts`; active DB journal and `package.json`.

**Create:** `docs/audit/union-customization-conversion-inventory.md` recording each pilot resource's current route, catalog key, renderer, translation namespace, sources, special interactions, and supported customization level. Record all `resolveGrievanceConfig` call sites separately. Choose one plain guide after inspection; do not select a bespoke interactive module merely because it is prominent.

**Decisions:** stable resource keys, pilot guide block IDs, reserved custom-route namespace, versioned compiled-default manifest. Check whether `cacheComponents` or other cache settings are active in `next.config.ts`; the plan's no-store serving contract must work with the actual configuration.

**Done when:** inventory identifies source ownership and explicitly unsupported surfaces; unchanged public tools/guides have a recorded regression baseline; no runtime changes yet.

#### C02 — Typed contracts and pure merge engine

**Proposed files:** `src/lib/customization/{types,schemas,scope,merge,defaults,registry}.ts` and colocated tests.

Implement discriminated resource/payload schemas, fixed-depth scope validation, stable block/source operations, compiled default manifest versions, provenance, null/clear/inherit rules, and per-tool configuration registration. Local allowlists and audiences tighten by intersection/maximum restriction. Reject arbitrary keys, route names, executable content and invalid reorders. Keep resolver functions independent of React, auth and database I/O.

**Fixtures:** two fictional unions with identical local numbers; sibling divisions; two local bargaining units; one local without a division; one source referenced by a guide; a member-only section. No real OPSEU content is needed.

**Done when:** fixtures prove each layer, missing layers, no-context neutrality, stable-ID operations, source resolution, and cross-union rejection. Missing override, explicit inheritance and withdrawal must be distinct results. A second union passes without a union-name code branch.

#### C03 — Policy service and authorization contract

**Proposed files:** `src/lib/customization/{policy,authorization,context}.ts`, `src/lib/auth/customization-session.ts`. Extend `src/lib/authorization/model.ts` only for typed capabilities; keep confidential domain decisions intact.

Build an authorization function returning a structured allowed/denied decision with scope and reason. Add a fresh Root-account check after the existing Site Admin gate. Require configured production MFA and durable auth for publishing. Resolve verified membership from active records and officer authority from canonical assignments, not legacy role names alone. Define the Phase 3 grant contract now but leave grant-based authorization disabled in production.

Create a narrow operator-target path; do not globally permit union mismatch in `decideCapability`. Public context validation can select only published scope descriptors and cannot enumerate private local metadata.

**Done when:** Root can target only customization operations; union admin, local executive and steward cannot mutate new shared content in Phases 1–2; forged presets and inactive accounts fail. Policy tests cover source/section visibility and stricter ancestors. Existing grievance authorization tests remain green.

#### C04 — Durable adapter, constraints, RLS, migrations

**Proposed files:** `src/lib/customization/{adapter,memory-adapter,drizzle-adapter,store}.ts`, `src/lib/db/schema/customization.ts`. Extend schema index, RLS contract, migrations/journal, generated shape, and isolated DB verification scripts as required. Select the next unused migration number; never use a number copied from this plan.

Implement the design tables, plus publication idempotency persistence (unique actor/target/key with request hash and result). Memory and Postgres implement the same adapter, with memory limited to tests/labeled demos. Add unique/composite parent constraints and explicit system-scope checks. There is no production memory failover.

RLS tests must cover authoring tables, revisions, heads, grants, assets, section controls, delivery fragments and projections. Anonymous runtime reads see only current public projections, never raw authoring JSON. Ordinary authenticated readers SELECT only permitted published fragments, not raw revisions. Specifically prove that a verified member cannot SELECT an officer-only fragment inside a member-readable guide. A public projection query joins the current release head and restrictive controls; if using a DB function to do this, test its restricted execution grants and fixed search path. Content-specific maintenance predicates consult current account/grants without recursive RLS. All route operations use the transaction-bound adapter.

**Done when:** fresh migration and upgrade of a populated fixture preserve existing tenant data; restricted-role INSERT/SELECT/UPDATE/DELETE deny cross-union and unauthorized same-union access; restart preserves publication state. Missing/mismatched RLS policy fails the generated deploy contract. Owner-only tests do not count.

#### C05 — Resolution service and dependency compiler

**Proposed files:** `src/lib/customization/{resolve,dependencies,compile,cache}.ts`.

Read heads/policies consistently. The publication compiler batches exact raw revisions and applies typed overlays; the reader service batches only permitted published fragments and returns an authorized DTO. Add the bounded immutable content cache with full scope/dependency/locale/schema keys. Keep actor decisions and current policy outside that cache. Pin compiled defaults and source dependencies. Implement the 500-release impact cap and deterministic conflict reports for changed/deleted blocks.

**Done when:** a stale cached resolution cannot bypass current withdrawal; missing DB content falls back correctly but DB exceptions do not; cross-local/unit cache collisions are impossible in fixtures. Tests demonstrate stable output independent of query row ordering and no per-section database query growth.

#### C06 — Drafts, preview, atomic publication and rollback

**Proposed files:** `src/lib/customization/{drafts,publish,preview,audit}.ts` and API routes described in section 4 below.

Implement optimistic draft saves, authenticated preview, bilingual validation, dependency impact preview, atomic revision/release/head/projection/audit updates and idempotency. Recheck ancestor heads while locked; publication fails 409 if dependencies moved. Implement compatible descendant rebase and blocking conflicts. Withdrawal/audience-tightening controls work independently of editorial conflicts. Rollback generates a new publication and preserves current restrictive policy.

All mutations use POST/PATCH, same-origin/CSRF protections consistent with repository auth, validated request size, allowlisted fields and rate limits appropriate to the operation. No publishing through GET. Preview stays private/no-store and authenticated; no permanent share tokens in v1.

**Done when:** concurrent publish test has one winner; retry does not duplicate audit/release; audit failure rolls back all writes; deletion of a parent block cannot drop a local override silently; emergency withdrawal works across two app processes. Publication has no interval where a new head points to an incomplete projection.

#### C07 — Root control panel and empty-state flow

**Proposed routes:** `/[locale]/app/site-admin/customization`, scope detail, resource editor, history and preview child pages. Reuse `SiteAdminCard` and existing form/error/status components; create `src/components/customization/*` only for feature-specific pieces.

Empty state says generic defaults are active. Root selects a real union, creates its customization scope, optionally creates missing tenant divisions/locals through an appropriately scoped existing administrative service, and drafts content. Scope creation does not create members or invite anyone. The editor offers inheritance/provenance, fields editable at each level, bilingual tabs, source review, visual preview, expected audience, impact conflicts and publication history. Root must be able to create a brand baseline, source and custom guide through forms without editing JSON or running a seed script. A validated JSON import can be optional, not the only authoring UI.

Make “inherit again,” “withdraw,” “publish,” and “rollback” separate labeled actions with a concrete impact summary. Scope remains visible in the page heading and mutation confirmation. Preserve unsaved drafts on validation failure. Provide keyboard navigation, error focus, pending-state feedback and mobile layout.

**Done when:** browser tests perform empty state → draft → preview → publish → edit conflict → rollback → withdraw. Direct page/API access by other roles fails. EN/FR UI values reviewed, axe checks run, no private preview bytes appear in public responses.

#### C08 — Pilot consumers and explicit baseline application

**Extend:** guide renderer selected in C01, `GuideLayout`, `SourcesBlock`, brand-registry-facing adapter, and a registered tool configuration consumer. Keep existing components for compiled fallback.

Convert only the pilot guide's supported blocks. Route all protected content through server DTO projection, not client source filtering. Add one new custom guide entirely from DB data. Add baseline preview/application through the existing DataAdapter and brand store so user values change only on explicit application; record applied baseline version and retain undo. Keep user profile IDs separate from tenant IDs.

**Done when:** changing guide text, source URL, and supported tool/brand defaults in Root UI is visible without a deploy; neutral existing pages and saved Brand Kits remain correct. Private content is absent from RSC/HTML/JSON. Phase 1 can be deployed with synthetic fixtures removed and no OPSEU baseline.

### Phase 2: Root content seeding and visibility activation

#### C09 — Audience and discovery UI

**Extend:** Root editor policy controls, server catalog/discovery composition, canonical custom-guide routes, metadata and sitemap builders, existing public-tools settings UI where appropriate.

Expose Public / Verified Member / Local Officer per resource and supported section; show inherited minimum audience. Do not conflate a disabled tool with a members-only configuration. Add intentional public teaser controls defaulting off. Render only safe catalog entries and safe section metadata. Preserve old redirects, query parameters, locale handling and neutral canonical paths. Scoped variants are noindex per design.

**Done when:** no private title, count, search excerpt, source URL or image appears in anonymous HTML, JSON-LD, OG, sitemap, RSC or downloadable bundles. Direct resource/API requests enforce the same policy as cards. Broad section toggles are unavailable on guides not converted in C01/C08.

#### C10 — Visibility adversarial tests and asset serving

**Extend:** customization asset upload/read routes, private storage adapter integration, e2e visibility tests and two-process integration fixtures.

Test public → member and member → officer changes after warming caches. Revoke membership and maintenance authority during an active session. Exercise a manually forged union/local/unit query, revision ID, asset ID, preview URL, export URL and disabled-tool direct URL. Verify all current-head joins and no-store headers. Review service-worker behavior and disallow protected precaching. Upload validation rejects mismatched MIME, over-limit data and unsupported SVG/HTML in v1. Private file responses authorize every request.

**Done when:** fresh requests after policy commit disclose no revoked content through either replica; unauthorized users cannot obtain private files by knowing storage keys; generic public tools still work without authentication or a baseline.

#### C11 — Root-operated real baseline workflow

Follow section 6's operator runbook after infrastructure deployment. Deliver operator documentation and a migration inventory, not mandatory OPSEU data in SQL. Link review follows the existing external-links audit playbook; national sites may require browser verification. Source/rights/translation claims require actual review, not plausible generated text.

**Done when:** Root can create the OPSEU structure, separate Academic/Support contexts and intended local/unit differences in the UI; a second synthetic union follows the same workflow. Record what was actually populated versus still empty. No content publication is implied by completing this documentation task.

#### C12 — Versioned workflow integration

**Read:** `docs/modules/GRIEVANCE.md`, loader consumers from C01, grievance schemas/services, hybrid import/export validation and tests. This is a separate risk-bearing implementation slice.

Create an async workflow resolver preserving the compiled/tenant fallback until explicitly enabled. Validate the complete CAConfig, scope, effective date and sources. New cases store the resolved immutable workflow version/snapshot. Update every applicable deadline/export/hybrid consumer to honor that snapshot. Existing cases retain their original behavior; if reconstructing an old configuration is ambiguous, flag it for review rather than inventing a historical deadline.

**Done when:** changing a published workflow affects new applicable cases but never silently recalculates old case deadlines; FT/PT fixtures differ only where configured; hybrid round-trip retains version/snapshot; wrong union/unit is denied. Re-run relevant grievance and hybrid suites. Do not present this slice as legal validation of agreement content.

### Phase 3: Delegation, local parameters, enterprise readiness

#### C13 — External union maintenance

Activate the grant table and policy branch behind the delegation flag. Root grants a named account an explicit union/subtree, resource kinds, draft/edit capability and expiry; publishing is a separate grant. No onward delegation, tenant transfer, role escalation, blanket source visibility or local casework rights. Do not repurpose existing local office delegations as union-wide grants.

Grant management UI shows scope, expiry, reason and effective capability. Revocation is immediate for subsequent requests; invalidate session version where existing auth requires it and always recheck grants. An editor whose grant expires keeps historical attribution but loses draft access. Scope reparenting invalidates/reviews impacted grants rather than moving their authority silently.

**Done when:** a union maintainer can edit only granted kinds/scopes, cannot publish without that grant, and cannot reach another union even if their account has an old role label. Root revocation works across replicas and a publish racing revocation is rejected if revocation committed before the publication authorization check/lock.

#### C14 — Local executive/steward parameters

Activate only allowlisted local parameter editing. Require current local membership plus assignment or explicit scoped parameter delegation. Edit UI displays locked inherited fields with provenance and explains approved local parameters in plain language. Use the same draft/publication service with a parameter-only payload; deny field injection server-side. Union baseline edits, guide body edits, policy loosening and new delegation remain unavailable.

**Done when:** an executive can change approved local contact/default fields but cannot replace union sources, make private content public, change another local, or edit restricted workflow fields. A steward without explicit authority remains read-only. This changes no existing personal Brand Kit freedoms.

#### C15 — Hosted entitlements and operational release gate

Add a bounded entitlement provider interface: `hasEntitlement(unionId, featureKey, at)` with a durable operator-managed implementation. Proposed `customization_entitlements`: union, feature key, active interval, state, operator audit reference; allowlist keys. Separate administrative maintenance entitlement from reader access. Initial commercial behavior: an expired maintenance entitlement blocks new hosted edits but preserves existing published access and export; any future reader-gated add-on uses its own explicit resource entitlement. Never retroactively paywall generic public Comms. No payment processor, checkout, trial spam, or usage tracking in this slice.

Complete performance/load, restore, two-replica policy and upgrade tests; record environment and measured latency. Confirm graceful expiry, renewals and operator overrides are audited and idempotent. Update setup/deploy guidance, module spec, RBAC documentation, PROGRESS and relevant rules. Add What's new only when steward-facing behavior actually ships.

**Done when:** entitlement never grants membership, free tools remain free, feature disable does not leak private content, backups restore publications/assets/audit, and all release gates below pass. External maintainers may then be onboarded by Root with a documented maintenance agreement and revocation owner.

## 4. Proposed API and service contracts

Routes below are proposed; localized UI paths use `[locale]`, APIs do not. Route handlers are thin; authorization, transaction scope and policy stay in shared services used by Server Components as well.

| API | Input / outcome |
|---|---|
| `GET /api/site-admin/customization/scopes` | Root-only bounded scope descriptors; no full roster |
| `POST /api/site-admin/customization/scopes` | Validated existing tenant IDs/parent; creates one scope |
| `POST /api/site-admin/customization/resources` | Scope, kind, stable key/slug; creates draft resource |
| `GET/PATCH /api/site-admin/customization/resources/[id]/draft` | Full admin draft / schema-valid patch; `If-Match` required for write |
| `POST .../[id]/preview` | Draft version/context/locale; private projection plus management diagnostics |
| `POST .../[id]/publish` | Expected draft+head versions, reason, idempotency key; atomic release result |
| `POST .../[id]/policy` | Explicit audience tightening/loosening, withdraw or enabled operation; version required |
| `POST .../[id]/inherit` | Remove active override with descendant impact validation; distinct from withdrawal |
| `GET .../[id]/history` | Authorized paginated release metadata, then separately authorized revision detail |
| `POST .../[id]/rollback` | Historical revision ID; produces validated candidate/new release under current policy |
| `GET /api/customization/content/[key]` | Validated scope/locale; authorized published DTO only, no-store |
| `POST /api/site-admin/customization/assets` | Root upload, validation/scan and private storage metadata |
| `GET /api/customization/assets/[id]` | Current resource/policy/membership check before bytes |
| `GET/POST /api/site-admin/customization/grants` | Phase 3 Root-only listing/create; separate revoke POST route |

Phase 3 introduces `/api/customization/manage/*` for granted maintainer/local actions, using the same services; do not relax `requireSiteAdminSession` to admit maintainers into the whole Site Admin surface. Add matching page guards for `/app/customization` when that UI is introduced.

Minimum adapter operations: `getScopeChain`, `getCurrentControls`, `getRevisions` (authoring only), `getPermittedFragments` (reader), `getDraft`, `saveDraft(expectedVersion)`, `previewImpact`, `publishAtomically`, `setPolicyAtomically`, `listHistory`, `getPublicProjection`, `getGrants`, `writeGrant`, and asset metadata operations. Keep transaction ownership in one service layer so nested store calls use the same `getDb()` transaction. Public projection, authorized fragment and private authoring interfaces should be separate TypeScript types to make accidental serialization difficult.

Error contract: 400 malformed input, 401 missing authentication, 403 denied known administrative action, 404 hidden/nonexistent ordinary resource, 409 stale version/dependency/idempotency conflict, 413 size limit, 422 structurally valid but unpublishable content, 503 unavailable durable service. Error responses contain no private payload or SQL diagnostics.

## 5. Verification matrix and commands

| Area | Required scenarios |
|---|---|
| Merge | Each of five layers; missing layers; explicit clear; remove vs inherit; scalar/object/list semantics; sibling isolation; malformed JSON; stable block/source IDs |
| Context | Two unions with same local number; forged unit from another local; archived scope; invalid slug; no context neutral fallback; preset binding grants no authority |
| Root-only | Every mutation denied to anonymous/member/steward/executive/union-admin; active Root succeeds; locked Root/stale role/MFA-off production fail |
| Reader audiences | Public/member/officer × union/division/local/unit; expired/future membership; expired assignment; union role alone insufficient |
| Delegation | Flag off; draft-only vs publish; scope/kind restriction; not-yet-active/expired/revoked; no onward grant; cross-replica revoke |
| Publication | Empty state; draft invisibility; optimistic conflict; ancestor conflict; orphan block; source dependency; atomic failure; retry; rollback; withdrawal |
| DB | Runtime-role RLS for every operation; same-union wrong local; malformed parent insert; public projection only; system-row restriction; fresh/upgrade/restart/restore |
| Disclosure | Raw HTML, RSC payload, JSON, scripts, metadata, sitemap, search, related cards, TOC, export, source links, assets and service-worker caches |
| Compatibility | Saved Brand Kit untouched; explicit apply/undo; public tool kill-switch; legacy route redirect; EN/FR parity and meaning; existing grievance boundaries |
| Workflow | New-case snapshot; unchanged old deadlines; unit-scoped CA; hybrid round-trip; unsupported config fails closed |
| Performance | 100-block guide, five scopes, 20 concurrent readers; warm/cold runs; 500-release impact bound; bounded process memory; two replicas |

For implementation milestones run appropriate focused tests first, then:

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:smoke
```

Configure the repository's Playwright server/base URL before the smoke command. Do not interpret connection failure as a passed check. Add proposed focused suites such as `src/lib/customization/*.test.ts` and `e2e/customization.smoke.spec.ts`; these files do not exist merely because named here.

For schema milestones, on an isolated disposable database with restricted runtime and separate migration-owner URLs:

```powershell
npm run db:contract:generate
npm run db:check
npm run db:deploy
npm run db:rls-smoke
npm run db:durability-smoke
```

Also extend/run the existing Docker migration smoke (`scripts/docker-migrate-smoke.sh`) in its supported Bash/Docker environment for fresh/upgrade/concurrent boot cases. Include a customization restart/restore fixture and an old-image/new-schema compatibility check. No production migration, seed, wipe or deployment is part of local testing. Read the current scripts before invoking them and supply isolated connection settings without printing credentials.

Phase 1 release gate: root-only UI/APIs, typed resolver, no-context fallback, pilot no-redeploy publication, durable RLS, private-byte exclusion and database restart all pass. Phase 2 adds full visibility/discovery/asset adversarial coverage and operator-seeded content review. Phase 3 adds grants/local parameters/entitlement isolation and operational restore/performance evidence.

## 6. Post-deployment Root seeding runbook

1. Verify the deployed build, DB boot attestation, durable auth, MFA, customization flag and empty editor. Confirm no demo fixtures are publicly published.
2. Select/create the real union through the supported tenant administration path; record its actual ID. Never use a Brand Kit preset as the tenant ID or provision accounts automatically.
3. Create its union customization scope and draft branding baseline. Add rights-approved logo assets, local catalog font IDs, colors, bilingual labels, and any allowed local fields. Preview a fresh kit and a saved kit; confirm saved kits require explicit application.
4. Create appropriate sibling division scopes for Academic and Support only after confirming the intended structure. Bind compiled preset/sector selectors explicitly. Do not default all new visitors to either division.
5. Add the local and actual bargaining-unit scopes where needed. Use distinct agreement/workflow configurations for applicable units; do not treat FT/PT Comms profile labels as membership facts.
6. Add sources with title, publisher, URL, applicability/jurisdiction, checked date and review date. Verify actual pages in a browser where automated checks fail. Record rights for mirrored/uploaded material. Empty sources remain drafts, not fabricated citations.
7. Create the first guide using structured blocks and source references. Review both languages for meaning. Set section and guide audiences deliberately; preview anonymous/member/officer behavior in each relevant scope.
8. Publish brand/source/guide dependencies through the impact preview. Confirm public discoverability only for intentional public entries and no private text in response payloads. Record release IDs in the operator change log.
9. Edit a source and one parent block, review descendant impact, and exercise rollback/withdrawal on a disposable pilot resource. Confirm a second browser receives the new permitted content without a code deploy.
10. Review the second synthetic union for neutrality and isolation, then archive its test publications. Document unfinished content and translation work. Begin the recurring editorial review process manually; do not add an automated scraper as an implicit dependency.

## 7. Risk register and decisions still requiring product validation

| Risk | Mitigation / owner |
|---|---|
| A few data-backed guides mistaken for universal CMS support | Conversion inventory and disabled unsupported controls; implementing engineer |
| Requirement interpreted as paid existing public Comms | Free baseline invariant in schemas/policy/tests; product owner reviews future pricing separately |
| Local shared edits conflict with Root-only launch | Phases 1–2 Root-only; explicit Phase 3 activation; product owner |
| Root content powers become cross-tenant casework powers | Dedicated target path and RLS policies, regression tests; security reviewer |
| Unsupported multi-sector local topology | Reject ambiguous binding; later ADR rather than invented hierarchy; Root/content owner |
| French publication delayed by missing translation | Draft remains private; require human meaning review; content owner |
| Historical guide update changes real case deadline | Immutable case workflow snapshot; separate audited migration; domain reviewer |
| Cached formerly public bytes remain reachable | Dynamic access endpoints/current policy reads; no immutable public bypass; engineer/operator |
| Public publication mistaken for revocable secrecy | Explain export/browser copies at publishing; editor/product owner |
| Union maintainer leaves organization | Time-bounded grant, named Root revocation owner, periodic review; operator |
| Content workload outgrows synchronous compilation | 500-release cap plus measured preparation time; later staged compiler ADR |

The defaults in the design allow infrastructure implementation without another design meeting. Before **real content publication**, Root must supply actual scope mapping, source rights and reviewed translations. Before **commercial launch**, product ownership must approve feature/pricing scope; this plan does not authorize charging users. Before **multi-sector locals**, choose and document an expanded topology. These are release prerequisites for those dependent activities, not reasons to stop building the core engine.

## 8. Copyable handoff prompt

> Continue the UnionOps Union & Sub-Collective Customization Layer from C06 in `docs/audit/plan-2026-09-22-union-customization.md`. Read the accepted design, AGENTS.md, current ground truth, latest `docs/PROGRESS.md`, and `src/lib/customization/README.md`. C01–C05 are implemented on `feat/union-customization-foundation` in the isolated worktree `C:\Users\Ryan\.codex\worktrees\union-customization-foundation\union-communications`; check status and recent commits first. C04 added migration 0054 and typed persistence adapters; C05 added compile/read/cache. Do not renumber or edit earlier migrations. Continue C06–C15 sequentially with progress notes and an atomic local commit per component. Keep Root-only shared editing through C12, free public Comms, tenant isolation, and explicit RLS transactions. Run local modular tests; defer full GitHub Actions E2E until all modular components are implemented. Do not push, publish real union content, or expand casework authority as collateral work. Report actual validation and remaining gaps.

## 9. Documentation delivery verification

The original preparation task changed documentation only and did not claim application tests, production deployment, runtime RLS tests, content seeding or security certification. Its Markdown links and whitespace were checked. Execute the implementation test gates as the corresponding code is built.

Implementation follow-up (historical): C01–C02 were implemented first, then C03 authorization and C04 database/RLS. Do not activate the feature based on foundation tests alone.
