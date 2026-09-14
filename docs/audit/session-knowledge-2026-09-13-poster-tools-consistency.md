# Session knowledge — Poster tools consistency audit + QOL kickoff (2026-09-13)

**Goal:** Capture the design review of the poster/canvas tool family (Meeting Background focal), the deferred cross-family inventory, and the Rule update so later sessions fix forward instead of re-auditing.

**Companion plans:** [`plan-2026-09-13-poster-tools-polish.md`](plan-2026-09-13-poster-tools-polish.md) (Meeting Background 5 priorities), [`plan-2026-09-13-poster-tools-qol.md`](plan-2026-09-13-poster-tools-qol.md) (family-wide QOL change list). Resulting contract: [`tool-editor-ux.mdc`](../../.cursor/rules/tool-editor-ux.mdc) → "Poster family consistency".

## Why the tools lost the "high-end" look

The fluid-architecture refactor (`9fcfd9e`, 2026-09-08) replaced the elevated white `Card` form root with a flat, faintly blue-tinted gradient panel (`ToolEditorLayout.tsx` — `rounded-xl border border-opseu-blue/15 bg-gradient-to-b from-opseu-blue/[0.04] to-white p-4 md:p-6`) while several tools still shipped legacy raw gray form controls (`rounded-md`, no focus ring, no shared primitives). Result: premium wide shell + utilitarian gray form = regression in perceived polish. Not broken — under-dressed relative to the fluid shell.

## Meeting Background focal findings

| # | Finding | File:line |
|---|---------|-----------|
| 1 | Raw `<select>` preset, raw `<textarea>` headline (`font-semibold uppercase`), raw checkbox toggles | `meeting-background/page.tsx:868,889,973` |
| 2 | Signature face-safe cue (webcam silhouette) deleted in `694d427` — no face affordance remains | history |
| 3 | `accentColor` drives lower-third/bands/rails but is never editable (only primary+secondary passed to `ToolColourSection`) | `meeting-background/page.tsx:1041` |
| 4 | `Bold` disabled in portrait with no reason shown | `meeting-background/page.tsx:918` |
| 5 | No gallery plate / format caption; static `previewAccessibleName`; no `Suspense` fallback | `meeting-background/page.tsx:1089,214` |

## Family-wide inventory (deferred, tracked in QOL plan)

- **Preset pickers — 3 paradigms:** bare `<select>` (meeting-background, action-card, qr-card, solidarity-poster, qr-board), grid chips (flyer-maker), toolbar chips (quote-card, graphic-maker).
- **Radius split:** raw controls `rounded-md` vs shared primitives `rounded-lg` — visible within single pages (solidarity-poster).
- **Colour sections — 3 patterns:** `ToolColourSection`/`ThemePicker` (most), `BrandSwatchPicker` (flyer-maker, graphic-maker), bare `ThemePicker` (logo-builder). Only quote-card exposes accent; the rest seed accent silently.
- **Suspense parity:** 5 wrap (`flyer-maker`, `action-card`, `qr-card`, `quote-card`, `graphic-maker`), 6 direct-export (meeting-background, solidarity-poster, board-banner, logo-builder, qr-board, org-chart).
- **Preview framing — 4 treatments:** grey-mat plate (action-card, qr-card), bare `CanvasWrapper`+shadow (flyer, solidarity print), `shadow-lg` rounded vs not (graphic/qr-board vs quote-card), no `CanvasWrapper` (board-banner, solidarity digital).
- **Hardcoded English:** qr-card Suspense `<h1>`, logo-builder `"Support Staff"`, quote-card initial copy, graphic-maker `detailForPreset`, per-tool `Local {n} - subtext` builders.
- **Checkbox label drift:** `text-opseu-dark` (most) vs `text-gray-800` (flyer-maker) vs shared `Checkbox` (org-chart only).
- **logo-builder error contract:** inline green/red `<p>` instead of `exportError`/`exportSuccess` → `Callout`.
- **org-chart:** only canvas tool with no colour controls (may be intentional).

## Hard-won context (don't regress)

- Face-safe overlays (silhouette / safe zone) must stay **outside** `canvasRef` (capture bakes them into PNG) and off `[data-export-root]`.
- Tool editor shell's flat panel is the fluid-architecture state — restore elevation (Priority 5) by adding shadow/solid white to the **shared** panel, not by re-nesting per-tool `Card` roots.
- No new `<select>` preset pickers; chips only (rule now explicit).
- Face cue restored 2026-09-13 (`CanvasFaceCueOverlay`, default on, capture-safe). HD type/lockup restore: [`session-knowledge-2026-09-13-meeting-background-hd-type.md`](session-knowledge-2026-09-13-meeting-background-hd-type.md).
- Capture-safe export colours remain inline hex/rgba inside export roots (no Tailwind colour utilities).

## Where knowledge lands

| Artifact | File |
|----------|------|
| Priority plan (Meeting Background 5) | `plan-2026-09-13-poster-tools-polish.md` |
| QOL change list (family-wide) | `plan-2026-09-13-poster-tools-qol.md` |
| Standing consistency contract | `.cursor/rules/tool-editor-ux.mdc` → "Poster family consistency" section |

## Shipped so far (2026-09-13)

- **Shared harness:** `ToolEditorLayout` elevated panel (P5); new `ToolLoadingFallback`, `CanvasSheetPlate`; `ToolColourSection` `onAccentChange`/`accentLabel` + `common.accentColour` EN/FR.
- **Primitives migration (QOL step 2):** meeting-background (P1 preset/headline/toggles + P3 accent), solidarity-poster (preset/headline/membership/toggles + accent), action-card (preset/saved-links/showUrl), qr-card (preset/saved-links/showUrl), qr-board (preset + `QrBoardSlotEditor` saved-links + showUrl), board-banner (accent `ColorField` via `ToolColourSection`), board-notice (`noticeType` select).
- **Preset chips (QOL step 3):** new `PresetChips`; meeting-background, solidarity-poster, action-card, qr-card, qr-board migrated off `<select>`. e2e hook: `data-preset-value` + `aria-pressed`, helper `expectPresetSelected`.
- **Suspense parity (QOL step 4):** six direct-export tools wrapped; every bespoke fallback replaced by `ToolLoadingFallback`.
- **i18n + helpers (QOL step 5/6/7/8/9):** `common.accentColour`, `logoBuilder.defaultSubText`, `graphicMaker.presetDetails`, `quoteCard.defaults` (EN/FR); `localLabel()` single-source helper adopted by canvas family + `CanvasBrandHeader` + `flyer-layouts`; logo-builder status → `Callout`; Org Chart no-colour intent documented.
- **Preview plate (QOL step 5):** `CanvasSheetPlate` adopted by action-card, qr-card, quote-card, graphic-maker, flyer-maker; four bespoke-preview exceptions documented in the rule.
- **e2e ID contract:** preset `<select>` IDs retired; specs updated to chip assertions (`#meeting-preset` etc. removed).

## Do not regress

- Tools stay on the shared form panel — no second nested `Card` as form root.
- The face cue is preview-only, default-toggled, and capture-safe.
- Accent is exposed wherever a tool renders an accent layer.
- Shared primitives only for form controls going forward.