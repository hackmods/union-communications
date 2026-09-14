# Plan — Poster tools polish: Meeting Background + shared editor chrome (2026-09-13)

**Audience:** Ryan + future agents.
**Status:** Planned — no code changed yet.
**Trigger:** Design review of the poster tools found Meeting Background and the broader canvas-tool family failed the "high-end UI" bar after the fluid-architecture refactor (`9fcfd9e`, 2026-09-08) swapped the editor from an elevated white `Card` to a flat faint-blue gradient panel while several tools still ship legacy raw gray form controls.
**Companions:** [`session-knowledge` conventions](session-knowledge-2026-08-25-public-tools-parity.md), [`.cursor/rules/meeting-backgrounds.mdc`](../../.cursor/rules/meeting-backgrounds.mdc), [`tools-preset-review-2026-09-06.md`](tools-preset-review-2026-09-06.md), [`canvas-visual-redesign-plan-2026-09-07.md`](canvas-visual-redesign-plan-2026-09-07.md).

**Verdict:** The tools aren't broken — they're *under-dressed relative to the new fluid shell*. Root causes: (1) raw legacy controls (`rounded-md`, no focus ring, no shared primitives) next to shared `rounded-lg` primitives; (2) the editor panel lost its elevation/shadow and reads as a pale 4%-alpha blue wash; (3) the Meeting Background tool lost its signature face-safe cue; (4) accent colour drives 3 of 8 layouts but is not user-editable; (5) presets are hidden in a bare `<select>`.

---

## Priority 1 — Meeting Background: migrate form to shared primitives

**Files**
- `src/app/[locale]/tools/meeting-background/page.tsx`
- `src/components/ui/Select.tsx`, `src/components/ui/Textarea.tsx`, `src/components/ui/Checkbox.tsx`, `src/components/ui/Input.tsx` (primitives — no changes expected)

**Work**
- Replace raw `<select>` (preset, `page.tsx:868-879`) with shared `Select` (`rounded-lg`, `min-h-11`, `bg-white`, focus ring).
- Replace raw `<textarea>` (headline, `page.tsx:889-897`) with shared `Textarea`; drop the `font-semibold uppercase` input chrome (keep uppercase visual on the canvas only, via `FitStackedHeadline`).
- Replace raw `<label>` + raw `<input type="checkbox">` toggles (`page.tsx:973-1016`) with shared `Checkbox` (accent-coloured, focus ring, `rounded`).
- Match label styling to shared primitive labels (`block text-sm font-medium text-gray-700`).

**Bar:** No raw `<select>`/`<textarea>`/`<input type="checkbox">` remain in the page. Shared primitives used end-to-end. Radius/height/focus consistent with flyer-maker.

---

## Priority 2 — Meeting Background: restore a face-safe cue

**Files**
- `src/app/[locale]/tools/meeting-background/page.tsx`
- `src/components/tools/canvas/index.tsx` (if the cue joins the shared canvas layer)
- `messages/en.json` / `messages/fr.json` (`meetingBackground` namespace)

**Work**
- Re-introduce a *preview-only* webcam-affordance: either the removed silhouette (`git show 694d427^` had `FacePreviewOverlay`) or a lightweight dashed "camera safe zone" instead of the deleted oval. Must stay outside `canvasRef` (capture-safety) and be toggleable (default **off** or **on**, matching the prior UX).
- Update `.cursor/rules/meeting-backgrounds.mdc` "No face silhouette / camera oval overlay" line to describe the new default.
- Pair with the existing `edgeClearance` hint copy so the two stay coherent.

**Bar:** Preview communicates "keep type off my face", capture is untouched, Playwright smoke green.

---

## Priority 3 — Meeting Background: expose accent colour

**Files**
- `src/app/[locale]/tools/meeting-background/page.tsx` (`page.tsx:1041-1049` — `ToolColourSection` call currently passes primary + secondary only)
- `src/components/tools/ToolColourSection.tsx` (verify accent passthrough exists)
- `src/components/tools/ThemePicker.tsx` + `ColorField` (shared — no changes expected)

**Work**
- Pass `accentColor={state.accentColor}` + `onAccentChange` into `ToolColourSection` and wire the update to `setState({ ...state, accentColor })`.
- Add an accent `ColorField` child (pattern already used by `quote-card` with `ColorField` children) so users can edit the colour that drives lower-third, bands, and rails layouts.
- Keep the low-contrast guard consistent with primary/secondary handling.

**Bar:** Accent editable and live on all layouts that use it; contrast helper fires on palette risk.

---

## Priority 4 — Meeting Background: visual preset picker + disabled-Bold explanation

**Files**
- `src/app/[locale]/tools/meeting-background/page.tsx` (`page.tsx:918-930` for Bold/portrait, `page.tsx:868-879` preset select)
- `messages/en.json` / `messages/fr.json` (`meetingBackground` namespace — Bold-portrait hint copy)

**Work**
- Replace the preset `<select>` with a slogan-chip grid (pattern: flyer-maker preset grid `grid-cols-2 sm:grid-cols-4`, selected ring state).
- When `Bold` is disabled in portrait, show a one-line hint why (e.g. "Bold layouts are landscape only.") via `title` + helper text under the SegControl.

**Bar:** Presets visible at a glance; portrait users understand the Bold disable; a11y (aria-pressed) preserved.

---

## Priority 5 — Restore editor panel elevation (shared)

**Files**
- `src/components/tools/ToolEditorLayout.tsx:194` (form panel: `rounded-xl border border-opseu-blue/15 bg-gradient-to-b from-opseu-blue/[0.04] to-white p-4 md:p-6`)

**Work**
- Give the editor panel back its elevation while keeping the fluid width rules: solid `bg-white` (or keep a much subtler tint) + `shadow-sm` (the pre-`9fcfd9e` `Card` look: `rounded-xl border border-gray-200 bg-white shadow-sm`).
- Re-check the `Card.tsx` padding change (`density === "compact" ? "p-4 md:p-5" : "p-4 md:p-6"`, commit `9fcfd9e`) so panel/card paddings stay aligned.
- Confirm no tool double-pads (meeting-background's own `space-y-5` container sits inside the shared panel).

**Bar:** Editor panel reads elevated and white across all tools; no horizontal overflow; `builders.smoke`/mobile tool-chrome specs green.

**Status:** ✅ Shipped (shared harness batch). Panel is now `rounded-xl border border-gray-200 bg-white shadow-sm p-4 md:p-6`. `Card.tsx` padding (`dense=compact → p-4 md:p-5`, default → `p-4 md:p-6`) already aligned; panel and card use the same rounded-xl/border-gray-200/white/shadow-sm vocabulary. No tool nests a second Card as form root.

---

## Evidence required to close

- Unit: no breakage in `src/components/tools/ToolEditorLayout.test.tsx`, `meeting-background-presets.test.ts`, `meeting-background-formats.test.ts`, `canvas-logo-mode`/`edge-clearance` tests.
- Smoke: `tools.layout-matrix.smoke.spec.ts`, `builders.smoke.spec.ts`, `tools.brand-kit-stress.smoke.spec.ts`, mobile tool chrome a11y specs.
- Manual: Meeting Background all 8 layouts × landscape/portrait; accent change live on lower-third/bands/rails; preset chips; Bold disabled hint on portrait.
- Commit on `main`.

## Non-goals (this pass)

- No redesign of Meeting Background art direction beyond meta tags / cue.
- No exhaustive every-layout × every-Look gallery.
- No change to Brand Kit style packages (`solid` / `field` / `workshop`).
- Priority order is implementation order; #5 unblocks the biggest visual gain for the whole family but is listed last because it is shared chrome — land it with #1 if a single editor pass is preferred.

---

## Deferred cross-family inventory (fix separately, tracked below)

See the review notes — shared-primitive migration, preset-picker unification, colour-section unification, Suspense parity, and hardcoded-English cleanup are tracked as the "poster-family inconsistencies" list to follow this plan's five priorities.