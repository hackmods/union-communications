# Session knowledge — public catalog filter QOL (2026-10-03)

**Audience:** future agents + Ryan.  
**Related:** [`PublicCatalogExplorer`](../../src/components/comms/PublicCatalogExplorer.tsx), [`public-catalog-facets.ts`](../../src/lib/comms/public-catalog-facets.ts), [`public-catalog.ts`](../../src/lib/comms/public-catalog.ts).

## What shipped

Public Create, Worksheets (Utilities), Learn, and Search shared one filter strip that always listed the full audience/topic/format/privacy enums. Many singles returned zero cards (e.g. Learn Format `maker`, Audience `member`). Create Topic was effectively one option because every Creation-group tool inherited topic `brand` from `toolsGroupCreation`.

Filters now:

1. Scope options to mode-visible catalog items.
2. Cascade options from items matching the *other* active filters (+ search).
3. Hide a facet control when fewer than two values remain (search stays).
4. On small screens, tuck facet selects behind **Show filters** so search stays first.
5. Tag tools with `TOOL_TOPIC_BY_SLUG` so boards/print/social/web/etc. appear on Create again.

## Lessons

- A shared explorer needs **page-derived facets**, not platform-wide enums. Empty options are a trust failure, not a “clearer taxonomy.”
- Group-level topic maps rot when nav collapses to Creation + Utility — prefer slug maps for discovery metadata.
- Hiding singleton facets (Create Format = only `maker`) saves more chrome than restyling the four-dropdown grid.
- Stale URL facet values stay clearable via active chips even when the select is hidden.

## Flush-out (same change)

- Singleton facets stay hidden even when selected in the URL (Create Format/Privacy) — they cannot narrow the page; non-narrowing values clear automatically.
- Stale facet cleanup uses mode items (other facets only), not search — a mistyped query must not wipe For/Topic choices.
- Filter-card **Clear filters** only appears when something is active; empty-state Clear remains.
- Mobile toggle shows an active facet count when collapsed; Back/forward re-opens the disclosure when facet params are present.
- Empty search hides facet selects (no options left); apply facets before searching in tests and journeys.

## Guards

- Unit: `public-catalog-facets.test.ts` (no alone-empty options; Create topics multi-valued; stale singleton detection).
- Smoke: Create/Learn Topic options each yield `count > 0` when chosen alone; Create hides Format/Privacy.
