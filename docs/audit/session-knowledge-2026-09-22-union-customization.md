# Session knowledge — union customization foundation

Saved across context/compute limits. C01–C06 are complete; resume at **C07**. Earlier notes remain historical; use the C06 section as current ground truth.

## Checkout and commits

- Branch: `feat/union-customization-foundation`.
- Active isolated checkout: `C:\Users\Ryan\.codex\worktrees\union-customization-foundation\union-communications` (recreated from `origin/main` after the prior Codex worktree was removed; C01–C04 already on main via #101).
- Shared checkout `C:\Users\Ryan\Projects\union-communications` may be on another branch — do not switch it for this work.
- C04 landed on main as part of `47ed0b6d` (`feat(customization): build union customization foundation (#101)`). Local `a5a0158` was the pre-merge C04 commit.
- C05 adds compile/read/cache on this branch; also fixes main typecheck breakages from #102 local-assign merge.

## Read these first

1. [Implementation plan](plan-2026-09-22-union-customization.md) — task sequence C01–C15 and copyable resume prompt.
2. [Design](../modules/UNION_CUSTOMIZATION.md) — accepted architecture, schema proposal, visibility and publication invariants.
3. [Foundation README](../../src/lib/customization/README.md) — actual calling contract and security boundary.
4. [Conversion inventory](union-customization-conversion-inventory.md) — pilot ownership, cache behavior and workflow call sites.
5. [Progress](../PROGRESS.md) and repository AGENTS.md.

## C06 current handoff (2026-09-22)

### Implemented

- `drafts.ts` — optimistic draft save/get with lockVersion compare-and-swap.
- `preview.ts` — authenticated private preview (`private, no-store`) plus dependency impact preview helpers.
- `publish.ts` — atomic publish (fragments/projections before head), idempotent operations, orphan 422, policy withdraw, rollback preserving restrictive policy, inherit-again.
- `audit.ts` — audit rows in the same transaction as mutations.
- API routes: draft PATCH, preview/publish/policy/rollback POST under `/api/site-admin/customization/resources/[id]/*`.

### Validation

- Customization + session suites: 123 tests passed.
- `npm run typecheck` and `npm run lint` passed.
- Full repo unit / Playwright / GitHub Actions E2E still deferred.

### Immediate next task: C07

Root control panel at `/[locale]/app/site-admin/customization` with empty state, scope creation, resource editor, history and preview. Reuse SiteAdminCard. EN/FR UI, axe, role denial tests.

## Remaining plan / stop points

- C07 Root panel → C08 pilot consumer.
- C09–C12 Phase 2; C13–C15 Phase 3. Keep public Comms free; no billing processor.

## Security lessons (still binding)

- Never serialize `resolveCustomization` output to readers; use `readPublishedContent` / authorized DTOs.
- Scope descriptors from trusted tenant records only.
- Root is `platform_admin` via the customization-only target path; do not weaken general union-mismatch checks.
- Entitlements remain fail-closed until C15.
