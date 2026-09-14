# Session knowledge — Solidarity Poster type-fit (2026-09-06)

## Symptom

Solidarity Poster Maker preview showed Keep-Calm headlines painting through the lockup logo and lead-in, with CTA/URL/local label stacking into the QR plate (letter stack + branding on).

## Root cause

1. Fixed letter/tabloid design height with **static Tailwind** `text-4xl`…`text-6xl` headlines (no measure/shrink).
2. Middle flex slot lacked `overflow: hidden` / content-aware fit — same sibling-overflow class as Board Notice before 2026-09-05.
3. Print export root used `maxWidth: 100%` without `FitWidthFrame`, so narrow preview columns could desync aspect from design type.
4. Layout-matrix only asserted plate geometry + column fit — not lead/type or type/footer overlap.

## Fix / platform uplift

- `CanvasFitStackedHeadline` in `src/components/tools/canvas/index.tsx` — width + height fit via `canvas-type-fit.ts`
- Solidarity Poster: `CanvasStackSlot` + fitted headlines; Brand Kit title × layout density factors (not raw Tailwind)
- Print: `FitWidthFrame` parent of `[data-export-root]` (Org Chart same pattern)
- Footer tagged `[data-canvas-meta]` / `[data-canvas-footer]`; lead row `[data-canvas-lead]`
- Playwright: `measureLeadTypeOverlap` + Solidarity type/meta cases in layout-matrix

## Fit loop lesson

`overflow: hidden` on the type wrap (and on nowrap lines) can make `scrollWidth === clientWidth` while glyphs are still clipped mid-word. Measure each `[data-canvas-headline-line].scrollWidth` against the slot budget — same idea as Meeting Background `FitStackedHeadline`.

## Rule for agents

Column-fit ≠ layout integrity. Keep-Calm / stacked-headline tools must use `CanvasFitStackedHeadline` (or `CanvasTypeBlock fit`) inside a bounded slot — never fixed rem/Tailwind display sizes on fixed print pages.

---

## Follow-up — branding crush + preview chrome (same day)

### Symptom

With a wide bilingual lockup (College Faculty), stack layout put lead-in and logo in one flex row. Letter design width (~306px) vs lockup `md` (~220px) left a one-character column — “Keep calm and” painted as **K / C / A**. Closer fought a duplicate local label inside the type slot; print preview looked half-empty (left-aligned sheet in a full-width shadow card).

### Fix

- Stack: logo row (centered `sm`, `max-w-[55%]`) → full-width lead → fitted headline/closer; local **once** in the footer
- Banner: truncating nowrap lead beside logo (never letter-wrap)
- `FitWidthFrame` `align="center"` + `frameClassName="shadow-lg"`
- Playwright: `measureLeadReadable` / `expectLeadReadable` (≥ ~3 glyphs)
