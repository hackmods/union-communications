# Plan — Poster family QOL uplift & change list (2026-09-13)

**Audience:** Ryan + future agents.
**Status:** Planned — companion to [`plan-2026-09-13-poster-tools-polish.md`](plan-2026-09-13-poster-tools-polish.md) (Meeting Background focal priorities). This file is the **family-wide** change list that follows the five priorities.
**Companion audit:** [`session-knowledge-2026-09-13-poster-tools-consistency.md`](session-knowledge-2026-09-13-poster-tools-consistency.md).
**Contract:** [`.cursor/rules/tool-editor-ux.mdc`](../../.cursor/rules/tool-editor-ux.mdc) → "Poster family consistency".

**Scope:** one consistency pass across the canvas/poster family — shared primitives, one preset-picker pattern, one accent-aware colour section, Suspense parity, one preview plate, i18n hygiene, shared local-label helper. No art-direction rewrite of canvases (see non-goals).

---

## 1. Shared primitives migration (all tools)

| Tool | Raw controls to migrate | Files |
|------|-------------------------|-------|
| meeting-background | `<select>` preset, `<textarea>` headline, raw checkboxes | handled in Priority 1 |
| solidarity-poster | `<select>` slogan preset, `<textarea>` headline, `<select>` membership link, raw checkboxes | `solidarity-poster/page.tsx:674-754` |
| action-card | `<select>` preset, `<select>` saved links, raw checkbox | `action-card/page.tsx:350-402,462` |
| qr-card | `<select>` preset, `<select>` saved links, raw checkbox | `qr-card/page.tsx` |
| qr-board | `<select>` preset, `<select>` saved links (incl. `QrBoardSlotEditor`), raw checkbox | `qr-board/page.tsx` |
| board-banner | raw `<input type="color">` accent → shared `ColorField` | `board-banner/page.tsx` |

**Bar:** no raw form controls remain; `rg "rounded-md" src/app/[locale]/tools` returns only non-form hits or zero.

## 2. Preset picker unification → visual chips

- Adopt flyer-maker grid chips (2×4, `aria-pressed`, selected ring) for content presets: solidarity-poster slogans, action-card presets, qr-card/qr-board presets, meeting-background (Priority 4).
- Keep toolbar `Button` chips for quote-card / graphic-maker (already shipped; leave as the short-list pattern).
- Delete per-preset `<select>` code paths after migration.

**Bar:** zero `<select>` preset pickers in `tools/`; preset selection visible at a glance.

## 3. Colour-section unification + accent exposure

- Extend `ToolColourSection` to accept `accentColor` + `onAccentChange` and render an accent `ColorField` child when provided.
- Expose accent where it renders: meeting-background (P3), solidarity-poster, action-card, qr-card, qr-board, board-banner.
- Retire logo-builder's bare `ThemePicker` → `ToolColourSection` wrapper.
- Leave flyer-maker / graphic-maker on `BrandSwatchPicker` (shipped pattern; documented as the acceptable alternative — do not mix both inside one tool).

**Bar:** any tool rendering an accent layer exposes it; one colour-section pattern per tool.

## 4. Suspense parity

- Extract a shared loading fallback (flyer-maker `FlyerMakerSuspenseFallback` pattern → e.g. `ToolLoadingFallback` in `components/tools`).
- Wrap the six direct-export tools: meeting-background, solidarity-poster, board-banner, logo-builder, qr-board, org-chart.

**Bar:** `Suspense` import + shared fallback in every tool page; no tool renders an un-styled flash before hydrate.

## 5. Preview plate unification

- Build a shared "sheet plate" component (grey mat `rounded-lg border-gray-200 bg-gray-100/80 p-4 md:p-6` + optional caption) wrapping `CanvasWrapper`.
- Apply to: meeting-background, flyer-maker, solidarity-poster (both print + digital), qr-card, action-card (already manual — swap to shared), quote-card (`rounded-none` → shared), graphic-maker, qr-board, board-banner (add `CanvasWrapper` where missing).
- Keep `data-export-root` / capture contract untouched (shadow outside `canvasRef`).

**Bar:** one plate component used by all tools; no tool renders a bare `overflow-hidden shadow-lg` with dropped canvas scaling.

## 6. i18n hygiene (no hardcoded English)

- qr-card Suspense fallback `<h1>` → `t(...)` key (add to `qrCard` namespace).
- logo-builder `"Support Staff"` default → `brandKit.local.subText` or param key.
- quote-card initial state copy → `quoteCard` namespace defaults.
- graphic-maker `detailForPreset` strings → `graphicMaker` namespace.
- Add EN/FR for all new keys; run `src/lib/comms/public-copy-style.test.ts` + i18n parity after edits.

**Bar:** no English literals in tool page default state / fallbacks in `src/app/[locale]/tools`.

## 7. Shared local-label helper

- Extract one helper (e.g. `localLabel(brandKit)` → `"Local {n}"` / `"Local {n}: {sub}"`) and use in: meeting-background, action-card, qr-card, solidarity-poster, board-banner, qr-board.
- Keep `resolveLocalNumber` as the underlying primitive.

**Bar:** `Local {n}` label text built in exactly one place.

## 8. logo-builder error contract

- Replace inline `<p className="text-sm text-green-700" role="status">` / `text-red-700` with `exportError`/`exportSuccess` → `Callout` (ToolEditorLayout contract) as in every other tool.

**Bar:** logo-builder status messages render as danger/success Callouts.

## 9. org-chart colour gap (confirm intent)

- Decide + action: either document why org-chart has no colour overrides (default `brandKit.primaryColor` is fine for exports) or add a `ToolColourSection`.
- Prefer documentation/comment + rule note unless a ticket exists.

**Bar:** state is explicit in code or docs; not silently inconsistent.

---

## Implementation order

1. **Shared harness first** (unblocks everything): Priority 5 elevation → shared loading fallback → shared sheet plate → `ToolColourSection` accent support. — ✅ **Shipped 2026-09-13**: `ToolEditorLayout` elevated panel; new `ToolLoadingFallback` + `CanvasSheetPlate` components; `ToolColourSection` accepts `onAccentChange`/`accentLabel` (renders an accent `ColorField`) + `common.accentColour` EN/FR key.
2. **Shared primitives migration** (per tool, starting with solidarity-poster mirrors of Meeting Background). — ✅ **Shipped 2026-09-13 (partially — step 2 done incl. accent exposure):** meeting-background, solidarity-poster, action-card, qr-card, qr-board (+ `QrBoardSlotEditor`), board-banner accent `ColorField`, board-notice `noticeType` select, and `meeting-background` Priority 1/3 (preset/headline/toggles → `Select`/`Textarea`/`Checkbox`; accent wired via `ToolColourSection`). Preset `<select>` IDs preserved for e2e (`#meeting-preset`, `#slogan-preset`, `#qr-preset`, `#qr-board-preset`, `#action-preset`).
3. **Preset chips** per tool. — ✅ **Shipped 2026-09-13**: new [`PresetChips`](../../src/components/tools/PresetChips.tsx); meeting-background, solidarity-poster, action-card, qr-card, qr-board migrated from `<select>`. e2e updated to `data-preset-value` + `aria-pressed` (`expectPresetSelected`).
4. **Suspense wrap** (six tools). — ✅ **Shipped 2026-09-13**: meeting-background, solidarity-poster, board-banner, logo-builder, qr-board, org-chart wrapped with [`ToolLoadingFallback`](../../src/components/tools/ToolLoadingFallback.tsx). All existing bespoke fallbacks (flyer-maker, graphic-maker, document-generator, quote-card, action-card, qr-card, bylaw-builder) replaced by the shared one.
5. **i18n + local-label helper + logo-builder contract + org-chart note** (safe, mechanical). — ✅ **Shipped 2026-09-13**: `logoBuilder.defaultSubText`, `graphicMaker.presetDetails`, `quoteCard.defaults`, `common.accentColour` EN/FR; [`localLabel()`](../../src/lib/utils/local.ts) helper adopted by the canvas family (+ `CanvasBrandHeader`, `flyer-layouts`); logo-builder inline green/red `<p>` → `Callout`; Org Chart no-colour intent documented.
6. **Preview plate unification.** — ✅ **Shipped 2026-09-13 (partial)**: [`CanvasSheetPlate`](../../src/components/tools/CanvasSheetPlate.tsx) adopted by action-card, qr-card, quote-card, graphic-maker, flyer-maker. Intentional exceptions documented in [`.cursor/rules/tool-editor-ux.mdc`](../../.cursor/rules/tool-editor-ux.mdc): meeting-background + solidarity-poster (safe-zone overlay alignment), qr-board (`QrBoardCanvas` owns its wrapper), board-banner (dual print-sheet pane).

## Evidence required to close

- Rule contract satisfied per tool; no raw controls / no `<select>` presets / accent exposed / Suspense wrap / one plate.
- Unit: `ToolEditorLayout.test.tsx`, `meeting-background-*`, `layout-class-matrix`, `public-copy-style` green.
- Smoke: `builders.smoke.spec.ts`, `tools.layout-matrix.smoke.spec.ts`, `tools.brand-kit-stress.smoke.spec.ts`, a11y specs (`hub.a11y`, public-tools), mobile tool chrome.
- Visual spot-check 375 / 768 / 1280 / 1536 per tool (rule: no tag-only refactors).
- Commit on `main` per batch.

## Non-goals

- No canvas art-direction rewrite of poster layouts (solids, bars, stacks stay as-is).
- No change to Brand Kit style packages or `COMMS_VISUAL_SYSTEM` canvas primitives.
- No exhaustive Look × layout gallery.
- Do not mix `BrandSwatchPicker` and `ToolColourSection` inside a single tool.
- Popup/presets that intentionally differ (org-chart) are documented, not force-unified.