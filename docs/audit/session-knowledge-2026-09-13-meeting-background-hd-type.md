# Session knowledge — Meeting Background HD type restore (2026-09-13)

**Trigger:** Steward export of Meeting Background (footer / lower-third, HD Local 243) showed a thin blue bar, postage-stamp type, and the local label wrapping one fragment per line (`Localol / 243 / Colledge…`).

## What actually broke the polish

Not the 2026-09-13 editor-chrome pass (shared primitives / white panel). That was under-dressed UI. The **export** look died earlier:

1. **Canvas Core (`f30d97c`, 2026-09-07)** moved Meeting Background from a fluid `w-full` + aspect-ratio preview (browser `rem` sized for ~700px, then `pixelRatio` blew the PNG up to 1920) to a **fixed 1920×1080 design-px** sheet scaled with `transform`.
2. **Headlines stayed in `rem`** (`FitStackedHeadline` max ~1.85rem ≈ 30px). On the old fluid box that exported at ~80px. On the design-px sheet it stays 30px.
3. **`LogoContainer` `max-h-20` (80px)** and `maxWidthCqw: 100` inside a `max-w-[42%]` flex row: the logo ate the lockup, and the local label `word-break`’d into a one-character column. Side-panel used `overflow-wrap: anywhere` on purpose for the print meta cap — wrong on HD.
4. **Print meta guards** (`expectMetaSupport` 23px cap, `data-canvas-meta` on lead/closer) were applied to a digital HD tool. Keep lead/closer supporting; **do not** use that cap as a headline budget.
5. Face cue was deleted in `694d427` and left as dead `showFaceCue` state.

Solidarity Poster already migrated to `CanvasFitStackedHeadline` + Brand Kit title × factor. Meeting was left on the July rem fitter.

## Restore (this session)

- `src/lib/comms/meeting-background-chrome.ts` — design-width shares for headline / pad / logo
- Meeting page uses `CanvasFitStackedHeadline` + canvas-relative `LogoContainer maxHeightPx`
- `CanvasFaceCueOverlay` preview-only, default on
- Rules: `meeting-backgrounds.mdc`, `canvas-core.mdc` item 12

## Do not regress

- Never size HD digital type with Tailwind `text-xs` / `rem` and hope `pixelRatio` saves it
- Never put `LogoContainer` at 100% of a flex row that also holds the local label
- Face cue stays outside `[data-export-root]`
- Graphic Maker / Quote Card / print headers were the same rem-on-design-px family — fixed 2026-09-13 (`graphicLayoutChrome` + `printBrandHeaderChrome`). Do not copy print meta caps onto display type.
