# Session knowledge — union customization foundation

Saved across context/compute limits. C01–C04 are complete; resume at **C05**. Earlier C01–C03 notes below remain historical; use the C04 section at the end as current ground truth.

## Checkout and commits

- Branch: `feat/union-customization-foundation`.
- Active isolated checkout: `C:\Users\Ryan\.codex\worktrees\union-customization-foundation\union-communications`.
- `4f56624` — agreed design, phased handoff and C01 conversion inventory.
- `43b1157` — existing president test fixture corrected to use valid Hub module IDs.
- `3deb07d` — C02 typed schemas, pure resolution engine, tests and progress tracking.
- Commits are local; no push, PR, deployment or GitHub Actions run was initiated for this feature.

**Do not switch the original shared checkout.** During completion, `C:\Users\Ryan\Projects\union-communications` was switched externally to `fix/president-local-prefs-typecheck` at `2dc34e7`. This task moved into the isolated checkout above to avoid disturbing the other task. Recheck current refs before integrating. The original untracked `.codex/` directory was left untouched.

## Read these first

1. [Implementation plan](plan-2026-09-22-union-customization.md) — task sequence C01–C15 and copyable resume prompt.
2. [Design](../modules/UNION_CUSTOMIZATION.md) — accepted architecture, schema proposal, visibility and publication invariants.
3. [Foundation README](../../src/lib/customization/README.md) — actual calling contract and security boundary.
4. [Conversion inventory](union-customization-conversion-inventory.md) — pilot ownership, cache behavior and workflow call sites.
5. [Progress](../PROGRESS.md) and repository AGENTS.md.

## What exists

`src/lib/customization/` contains strict Zod schemas, types, scope-chain validation, a code-owned tool configuration registry, versioned manifest validation, typed merge operations and `resolveCustomization`.

- Fixed hierarchy: system → union → optional division → local → optional bargaining unit.
- Explicit missing/inherit/withdraw semantics; invalid data throws instead of falling back.
- Stable-ID block/source additions, replacements, removals and complete reorder validation.
- Restrictive audience inheritance and editable-field intersection; disabled ancestors win.
- Removed/re-added sections retain their inherited audience floor.
- Pinned source dependencies must belong to the selected chain and cannot be more restricted than their consuming section.
- Whole workflow replacement, nullable logo clearing and per-field/block/policy provenance.
- Synthetic fixtures cover independent unions, sibling divisions, locals and bargaining units.

## C04 current handoff (2026-09-22)

### Git and workspace

- Continue only in `C:\Users\Ryan\.codex\worktrees\union-customization-foundation\union-communications`, branch `feat/union-customization-foundation`. The shared checkout `C:\Users\Ryan\Projects\union-communications` belongs to another active task; do not switch it.
- Commits before C04: `4f56624` docs/design inventory; `43b1157` existing president test fixture fix; `3deb07d` C02 engine; `fd5d44f` reset handoff; `c6c5c99` C03 authorization.
- This C04 work is intended to be one commit: `feat(customization): add durable schema and RLS adapters`. Verify that commit exists and worktree is clean before continuing. No push/PR/deploy/GitHub Actions E2E has been initiated.

### C04 implementation

- `src/lib/db/schema/customization.ts` declares 15 tables; `src/lib/db/migrations/0054_customization_foundation.sql` adds constraints, ownership triggers, immutable history and RLS. `_journal.json` is append-only at idx54; `docker/db-required-shape.json` and `src/lib/db/rls-contract.ts` cover the migration's RLS surface. The existing journal sequence stays unchanged.
- Authoring tables are Root+MFA only through current database account roles. RLS checks exact union context and scope lineage. Reader fragments check current heads, every ancestor policy, section audience, local membership, officer assignment and referenced control resources. Entitlements fail closed until C15. Public projections allow discovery fields only (`key`, `title`, `summary`, `canonicalPath`); bodies are separately authorized fragments.
- `CustomizationAdapter.transaction()` owns `withRlsContext`; do not call it from inside another RLS transaction. Keep all operations for one atomic service operation on its provided transaction handle. It rejects escaped transaction handles, non-bounded updates and writes to immutable tables. `readerTransaction()` forcibly clears MFA/cross-local and exposes reads only, ensuring even Root gets ordinary reader RLS. The C05 service still must return a safe DTO and keep raw compiler content out of responses.
- `getCustomizationAdapter()` throws without configured Postgres; no silent memory fallback. `createCustomizationDemoAdapter()` is only test/explicit nonproduction demo and uses serialized rollback-capable in-memory state.
- `scripts/customization-rls-smoke.mjs`: local disposable DB, 99 assertions, fixtures roll back. It exercises all 15 tables, unauthenticated/private access, restricted inserts/updates/deletes, same-number/different-union locals, membership end, officer revocation, section tightening, stale release, withdrawal, wrong parent/immutable ownership, security-definer ACL and search path.
- `scripts/customization-upgrade-smoke.mjs`: requires an **empty disposable loopback database ending `_test`** and owner URL. Applies journal through 0053, inserts a union/local fixture, runs current deploy gate, proves records persist, drops a reader policy to prove required-shape verification fails, restores it, and verifies success.
- `scripts/customization-durability-smoke.ts`: requires owner and `unionops_app` runtime URLs for same local disposable `_test` DB. Exercises adapter rollback, single-winner optimistic write race, writes revision/release/policy/fragment/head, then launches a separate Node/tsx process to prove durable read. Leaves data in that disposable database; reset/drop only that specifically named test database/container after checking target.
- Run them through `npm run db:customization-rls`, `npm run db:customization-upgrade`, and `npm run db:customization-durability`, respectively, with required task-local environment URLs described above.
- Migration edge: public policy/view uses control-resource policy recursively; section controls apply from exact-key ancestors. The projection is metadata only to avoid embedding private bodies in an anonymous-row policy. Maintain that contract in C05/C09.

### C04 checks already passed

- `npm run test:unit -- --maxWorkers=2 src/lib/customization src/lib/auth/customization-session.test.ts src/lib/db`: 10 files, 157 tests passed.
- `npm run typecheck`; `npm run lint` (only existing warning: unused `userInvites` in `src/lib/site-admin/demo-purge.ts`); `npm run db:check` (55 migration journal entries, 120 schema tables).
- Fresh isolated deploy verified tail 0054, 120 tables, 1,273 columns and 134 policies. Restricted role RLS smoke: 99 assertions passed. Populated 0053 → current migration upgrade and missing-policy rejection passed. Durable adapter rollback/concurrency/second-process persistence passed.
- A full repository unit run and local Playwright smoke were launched, then the user interrupted due to compute exhaustion. **Neither is verified/passed.** Do not spend more time repeating them before resuming C05; later do repo-required checks at suitable milestone. GitHub Actions E2E remains deferred until all modular tasks finish.

### Immediate next task: C05

Read C05 in the implementation plan and C05 resolution requirements in the design. Add `dependencies.ts`, `compile.ts`, and `cache.ts` alongside existing internal `resolve.ts`; inspect actual latest code first. Batch exact revisions and dependencies with stable ordering and strict pins. Produce a reader-specific DTO that cannot contain private section/source bytes, and run all delivery queries through `readerTransaction` plus current membership/policy checks. Keep actor decisions and current withdrawal outside immutable content cache. Cache keys must include full scope chain, locale, resource, schema and dependency revisions; missing content falls back, database exceptions do not. Implement 500-release impact cap/conflict report. Add tests for query row order, cross local/unit collisions, cache withdrawal after warmup, DB-error propagation, and bounded query count. Do not wire guide routes until C08.

### Remaining plan / stop points

- C05 compiler/read/cache → C06 drafts/preview/atomic publication → C07 Root panel → C08 pilot consumer.
- C09 public discovery/policy UI → C10 adversarial asset serving → C11 Root content workflow docs (no auto-seeded or generated factual union content) → C12 versioned grievance/hybrid snapshots.
- C13 grants (flag off until explicitly implemented) → C14 parameter-only local edits → C15 entitlements/ops. Keep public Comms free; no billing processor.
- User authorized full plan, sequential commits and local tests. Their latest steering said they were out of compute; this is why execution stops at committed C04, while later tasks remain pending. No extra approval is needed to resume in another session.

**Not built:** authorization, durable adapters, SQL tables/migrations/RLS, draft/publication transactions, admin UI, consumer integration, real union content or billing. The schema foundation means TypeScript/Zod payload contracts, not deployed database DDL.

The compiled manifest is deliberately empty until C08 converts consumers. Existing TSX pages, browser Brand Kits and live case deadlines remain unchanged. The proposed pilot is the Print guide; Rules of Order registers only initial category/action defaults, not new executable tool behavior.

## Security and implementation lessons

- `resolveCustomization` is an authoring/compiler function. Its resolved output may include private sections. **Never serialize it directly to readers.** C03 authorization and C04–C06 published-fragment delivery remain mandatory.
- Scope descriptors must come from trusted tenant records, not client-asserted IDs. Brand Kit presets and local numbers grant no membership.
- `editableFields` constrains later local editing; it does not authorize a caller. The pure compiler intentionally has no actor context.
- Source dependency audiences must already include effective ancestor restrictions. Current policy/withdrawal and membership must be rechecked by the future serving layer.
- Root is existing `platform_admin`. Do not weaken general union-mismatch checks to enable operator editing; use a customization-only explicit target path.
- C03 must require fresh active-account/role checks and production MFA readiness. The existing Site Admin gate follows configured MFA policy and alone does not prove MFA is enabled.
- Existing tool disable switches and Hub module gates still apply; compiler policies cannot bypass them.
- SQL follows ADR-020 only. Re-read the journal before C04; it ended at `0053_access_requests` during inventory. No migration number is reserved.
- Preserve free generic public Comms. New shared customization editing stays Root-only in Phases 1–2; delegation/local parameter editing is Phase 3.

## Validation evidence

- C01 baseline: 7 suites / 69 tests passed.
- C02 focused tests: 60 passed. Together with the CSV-to-XLSX regression: 62 passed.
- `npm run typecheck` passed.
- `npm run lint` passed with one existing `src/lib/site-admin/demo-purge.ts` unused `userInvites` warning.
- `npm run test:unit -- --maxWorkers=2`: **343 suites passed; 2,201 tests passed, 1 skipped**, about 311 seconds.
- Initial unrestricted-worker full suite had one CSV-to-XLSX 5-second timeout. It passed on the focused bounded run and then the full bounded run; no timeout threshold or assertion was weakened.
- Existing president test used `sameModuleSet(["a", "b"], ...)`, which failed typechecking before this feature. Separate commit `43b1157` uses valid `comms`/`portal` IDs and retains the order-independent assertion; its four focused tests passed.
- Validation ran in the original checkout before it switched branches. The isolated checkout contains the identical tested source commit; only Markdown hard-break whitespace was cleaned when finalizing `3deb07d`. Dependencies may need local setup in this new checkout before the next test run.
- Documentation links and staged whitespace were checked. No runtime DB, browser E2E or production validation is claimed.

## Exact next action

Implement **C03 — Policy service and authorization contract**, using the plan's acceptance gate. Inspect current authorization/model, resolve-actor, Site Admin session and MFA helpers first. Add shared customization capability decisions, verified relationship checks and a narrow operator target path. Keep grant-based production authorization off until Phase 3. Prove Root-only mutations, inactive/stale account denial, forged-context denial and unchanged grievance authorization with local tests.

Then update PROGRESS/spec status and make an atomic local commit. Proceed to C04 durable schema/adapters/RLS only after C03 passes. The user explicitly requested sequential components, progress updates and clean commits after each component, and **deferring full GitHub Actions E2E triggering/debugging until modular implementation is complete**. Do not push just to obtain CI at this stage.

The most recent user instruction was to save this knowledge and commit before reset; it did not authorize consuming a usage reset credit or starting additional implementation in this turn.
