# Session knowledge — union customization foundation

Saved before context/usage reset. C01–C02 are complete; resume at **C03**.

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
