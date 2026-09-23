# Session knowledge — union customization foundation

Saved across context/compute limits. C01–C05 are complete; resume at **C06**. Earlier notes remain historical; use the C05 section as current ground truth.

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

## C05 current handoff (2026-09-22)

### Implemented

- `dependencies.ts` — stable revision/source pin ordering, dependency-manifest digests, `MAX_AFFECTED_RELEASES = 500`, deterministic block impact reports (`changed` / `deleted` / `orphan`).
- `compile.ts` — `compilePublication` materializes per-locale delivery fragments + public discovery DTOs; `readPublishedContent` is the ordinary reader service (readerTransaction only, authorized DTO, no raw resolver bytes).
- `cache.ts` — `ImmutableContentCache` with 32 MiB budget; keys include resource, full scope chain, locale, schema, dependency digest, release. `hasWarm` detects withdrawal after cache warmup. Actor decisions stay outside the cache.
- Reader rules: missing publication → compiled fallback; DB exception → `service_error`; warmed cache + empty RLS fragments → `withdrawn` (not fallback); membership rechecked via `decideCustomizationRead`.

### Collateral typecheck fixes (main breakages from #102)

- `site-admin/unions/[id]/route.ts` — cast SQL rows through `unknown`.
- `site-admin/unions/route.ts` — optional `seed.locals?.[0]`.
- `InvitesBoard.tsx` — restore `setRequestId` setter (was destructured away).
- `invite-routes.test.ts` — pass `Request` into `GET` listInvites.

### Validation

- `npx vitest run --maxWorkers=2 src/lib/customization src/lib/auth/invite-routes.test.ts src/lib/site-admin/api-routes.test.ts` — 133 passed.
- `npm run typecheck` — passed after the collateral fixes.
- Full repo unit / Playwright / GitHub Actions E2E still deferred per plan until modular tasks finish.

### Immediate next task: C06

Drafts, preview, atomic publication and rollback (`drafts`, `publish`, `preview`, `audit` + API routes). Optimistic draft saves, authenticated preview, bilingual validation, dependency impact preview, atomic revision/release/head/projection/audit, idempotency, 409 on moved ancestors, compatible descendant rebase, withdrawal independent of editorial conflicts. No GET publishing. Preview private/no-store.

## Remaining plan / stop points

- C06 drafts/preview/atomic publication → C07 Root panel → C08 pilot consumer.
- C09 public discovery/policy UI → C10 adversarial asset serving → C11 Root content workflow docs → C12 versioned grievance/hybrid snapshots.
- C13 grants (flag off until explicitly implemented) → C14 parameter-only local edits → C15 entitlements/ops. Keep public Comms free; no billing processor.

## Security lessons (still binding)

- Never serialize `resolveCustomization` output to readers; use `readPublishedContent` / authorized DTOs.
- Scope descriptors from trusted tenant records only.
- Root is `platform_admin` via the customization-only target path; do not weaken general union-mismatch checks.
- Entitlements remain fail-closed until C15.
