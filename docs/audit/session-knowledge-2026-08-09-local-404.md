# Session knowledge — 2026-08-09 (Local 404)

**Audience:** future agents + Ryan.  
**Companion:** [`current-ground-truth.md`](current-ground-truth.md), [`../PROGRESS.md`](../PROGRESS.md).  
**Branch/commit:** `feat/local-404-solidarity` → merged to `main` (`feat(ux): ship Local 404 solidarity status chrome`).

---

## What happened

Ryan asked for a QOL modernization of sterile App Router 404/error UI (“404 This page could not be found.”) with fun union-agnostic tie-ins. Scope grew into a **full solidarity pass**: rotating quips, quiet **243** wink, deepen **snowmobile** egg, Portal boundaries, poll/RSVP/meeting true HTTP 404s, and root/`global-error` so Next’s stock UI never shows.

---

## What shipped

| Slice | Outcome |
|-------|---------|
| Shared chrome | `RouteStatusPanel` (locale/intl) + `RouteStatusStatic` (root/global) |
| Copy | `routeUi` EN/FR — title **Local 404** / FR **Section 404**; error **Needs a steward** |
| Quips | `routeUi.quips.*` banks; stable hash of pathname via `src/lib/utils/route-status-quip.ts` |
| Buckets | `notFound`, `error`, `hub`, `portal`, `poll`, `rsvp`, `meeting` |
| Eggs | Quiet 243 footnote; 5× UnionOps mark tap → JUST BE LOVED snowmobile dialog |
| Asset | `public/easter-eggs/just-be-loved-snowmobile.png` (+ keep `.cursor/easter-eggs/` for agents) |
| Boundaries | locale + Hub + **Portal** `not-found`/`error`/`loading`; root `not-found`; `global-error` |
| Entity 404 | poll / RSVP / meeting missing → `notFound()` (HTTP 404, path-aware quips) |
| Fallback EN | `src/lib/constants/route-status-fallback.ts` (no next-intl on crash path) |

---

## Hard lessons (do not re-learn)

### 1. Stock Next string ≠ our `routeUi`

**“404 This page could not be found.”** is Next’s default when a miss escapes `[locale]` (passthrough root layout, missing root `not-found` / `global-error`). Locale pages already said “Page not found” before this pass — fix **root + global** when stewards report the stock string.

### 2. Inline missing-entity UI is HTTP 200

Returning JSX from `poll`/`r`/`meetings` when the entity is missing looked like a 404 but was **200**. Prefer `notFound()` and flavored quips via path buckets on the shared locale not-found.

### 3. Quips: stable hash, not `Math.random`

Same URL always gets the same quip (`hashPathname` + modulo). Fresh-random feels broken (“flickering copy”) and fails a11y/screenshot consistency.

### 4. Root / global cannot depend on next-intl

`global-error.tsx` must own `<html>`/`<body>` and import `globals.css`. Use `RouteStatusStatic` + `ROUTE_STATUS_FALLBACK`. Prefer `next/link` over raw `<a>` (`@next/next/no-html-link-for-pages`).

### 5. Portal is its own segment

`/portal` sits under `[locale]` but is not Hub. Misses used to show public tools/home CTAs. Portal needs its own `not-found`/`error`/`loading` with `backToPortal`.

### 6. 243 + snowmobile — product-subtle, not marketing

- **243:** quiet footnote + one quip on status surfaces only — still not a tenant signup default (`resolveLocalNumber`).
- **Snowmobile:** deepen only (5 taps). Never auto-show; never block recovery CTAs. Asset must be under `public/` to serve; `.cursor/easter-eggs/` remains agent-facing source copy.

### 7. Dirty-tree discipline

Unrelated WIP + UU conflicts on `messages/*` / `PROGRESS.md` poisoned early writes. **Stash unrelated work, hard-clean branch from `origin/main`, then implement.** Concurrent workshop worktrees made “files vanished” look like tool failure.

### 8. PowerShell + `[locale]` paths

`Test-Path "src/app/[locale]/..."` treats `[]` as a character class — use **`-LiteralPath`**. Shell chaining uses `;`, not `&&`.

---

## Decision log

| Choice | Locked | Why |
|--------|--------|-----|
| Tone | Wry solidarity | “Local 404”, picket/grievance metaphors, union-agnostic |
| Quip pick | Stable path hash | Deterministic, testable |
| 243 / snowmobile | Subtle product eggs | Not default chrome; deepen trigger for snowmobile |
| Poll/RSVP/meeting | `notFound()` | Correct status; domain quips via buckets |
| Hub detail empties | Out of scope | Resource empties ≠ route 404 |
| FR title | “Section 404” | “Section” ≈ local in FR labour register |

---

## File map (agents)

| Concern | Path |
|---------|------|
| Quip helper + tests | `src/lib/utils/route-status-quip.ts`, `.test.ts` |
| EN fallback (root/global) | `src/lib/constants/route-status-fallback.ts` |
| Locale panel + egg | `src/components/layout/RouteStatusPanel.tsx` |
| Static panel | `src/components/layout/RouteStatusStatic.tsx` |
| Copy | `messages/en.json` + `fr.json` → `routeUi` |
| Root / global | `src/app/not-found.tsx`, `src/app/global-error.tsx` |
| Portal boundaries | `src/app/[locale]/portal/{not-found,error,loading}.tsx` |
| Snowmobile asset | `public/easter-eggs/just-be-loved-snowmobile.png` |
| Agent easter note | `AGENTS.md` (Easter Egg section) |

---

## Ops / verify

- Manual: `/en/this-does-not-exist`, Hub miss, `/en/portal/nope`, `/en/poll/bad`, `/en/r/bad`, meeting miss, 5× mark → egg
- Automated: `npm run lint`; `npm run test:unit` (includes quip tests)
- Stash note: workshop WIP was parked in git stash during isolation; workshop later landed on main separately — merge Local 404 after workshop, resolve `PROGRESS.md` by **keeping both** top sections
