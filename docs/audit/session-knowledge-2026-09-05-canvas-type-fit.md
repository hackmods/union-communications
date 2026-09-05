# Session knowledge — canvas type-fit / Board Notice overlap (2026-09-05)

## Symptom

Mobile Preview on Board Notice Maker showed the large headline painting through Date / Time / Location (and body colliding with Location). Badge text “GENERAL MEMBERSHIP MEETING” (uppercase of the notice-type label) sat above a second large headline with the same words — looked like duplication, but the hard failure was **sibling overflow paint**.

## Root cause

1. Print canvases use a **fixed design height** (letter/tabloid at `PRINT_PAGE_PX_PER_INCH`).
2. Stack/band/split put `CanvasTypeBlock` in a `flex-1 min-h-0` middle slot **without** `overflow: hidden` / content-aware shrink.
3. Brand Kit **display** type + lockup logo + long steward copy made the type block taller than the slot; overflow painted over `MetaBlock` (same stacking context, no clip).
4. `#39` fixed *column* scale (preview width), not *internal* slot fit. Restoring lockup logos later increased header height and tipped stack layouts over the edge.

## Affected tools

Any fixed-height print canvas using `CanvasTypeBlock` in a flex stack without fit:

- **Board Notice Maker** (stack / band / split) — primary report
- **Flyer Maker** (same layout family)

QR Board / wallet tools already had plate/URL overlap guards; they were not this bug class.

## Why tests missed it

- Layout matrix only called `measurePreviewFit` / `expectPreviewFitsColumn` (sheet vs column).
- Overlap helpers existed for QR plates/URLs only.
- No `[data-canvas-type]` ↔ `[data-canvas-meta]` assertion.
- Default demo copy sometimes fit after width scaling — long copy + lockup + display type did not.

## Fix / platform uplift

- `src/lib/utils/canvas-type-fit.ts` — clamp / step / overflow math
- `CanvasTypeBlock` `fit` + `CanvasStackSlot` — measure and shrink into the slot
- Board Notice + Flyer opt in; notice-type badges shortened (Meeting / Bargaining / …)
- `measureTypeMetaOverlap` + layout-matrix Board Notice cases (default + long copy @ 390)

## Rule for agents

Column-fit ≠ layout integrity. For stacked print tools, assert type/meta (or equivalent) non-overlap after content changes.
