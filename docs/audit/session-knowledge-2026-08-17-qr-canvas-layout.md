# Session knowledge — 2026-08-17 (QR Board canvas QOL + layout-class CI)

**Audience:** future agents + Ryan.  
**Companion:** [`plan-2026-08-17-qr-board-canvas-qol.md`](plan-2026-08-17-qr-board-canvas-qol.md) (checklist + B1–B9), [`current-ground-truth.md`](current-ground-truth.md), [`COMMS_VISUAL_SYSTEM.md`](../modules/COMMS_VISUAL_SYSTEM.md), [`.cursor/rules/comms-visual-system.mdc`](../../.cursor/rules/comms-visual-system.mdc).  
**Landed on:** `main` — `89fccbb` (QR Board) → `2785ddc` (layout-class CI) → `53cb63b` (shared wallet FitWidth).

---

## What happened

Two trains in one week:

1. **QR Board canvas QOL** — multi-QR letter/tabloid sheets were clipping tiny codes, truncating URLs, and letting a footer band eat the grid. Fixed with explicit square plates, header branding, FitWidth preview scale, and capped display typeScale.
2. **Layout-class CI matrix** — locked **default layouts per geometry class** in Playwright `@smoke` (not every preset copy variant). Extracted shared geometry helpers + Vitest guards. Minimal product fixes where tests found real bugs (QR Card reference preset, Flyer `?preset=`, `CanvasQrPlate` maxHeight footgun).

**Do not port the Board pack blindly.** The original failure was **several QR codes on one letter sheet**. Sibling tools are single-canvas or wallet-sized — same *class* of bugs, milder symptoms.

---

## What shipped

### QR Board product (`89fccbb` and earlier)

| Area | Outcome |
|------|---------|
| Plates | `qrBoardPlatePx` — filled squares at design width; no `%` on both axes |
| URLs | `formatCanvasDisplayUrl` + wrap in document flow; overlap tests clip to cell |
| Branding | Local label in **header** (mark logo on 4-up / 6-up); no full-width footer band |
| Preview | `FitWidthFrame` — layout at design size, `transform: scale()` to column |
| Density | ≤2 roomy · ≤4 **regular** · else compact — **4-up is regular, not roomy** |
| Tests | All `QR_BOARD_PRESETS` loop + 390px 4-up |

### Layout-class CI (`2785ddc`)

| Area | Outcome |
|------|---------|
| Helpers | [`e2e/helpers/canvas-layout.ts`](../../e2e/helpers/canvas-layout.ts) — plate/URL/preview-fit geometry |
| Math | [`src/lib/utils/canvas-layout-geometry.ts`](../../src/lib/utils/canvas-layout-geometry.ts) + unit tests |
| Matrix | [`src/lib/comms/layout-class-matrix.ts`](../../src/lib/comms/layout-class-matrix.ts) — e2e ids per geometry class |
| Smoke | [`e2e/tools.layout-matrix.smoke.spec.ts`](../../e2e/tools.layout-matrix.smoke.spec.ts) — Flyer, Graphic, Solidarity, Meeting, defaults |
| QR share | Extended [`e2e/tools.qr-share.smoke.spec.ts`](../../e2e/tools.qr-share.smoke.spec.ts) — tabloid, QR Card link + reference, Letter @ 390px, Action Card |
| Flyer | `?preset=` deep link in `useOneShotBrandSeed` via `isFlyerPresetKey` |
| QR Card | Reference preset: line-clamp copy, explicit square wrapper, `shrink-0` QR block |
| Primitive | Removed `maxHeight: 100%` from `CanvasQrPlate` |

### Wallet Letter FitWidth (`53cb63b`)

| Area | Outcome |
|------|---------|
| Shared primitive | [`FitWidthFrame.tsx`](../../src/components/tools/FitWidthFrame.tsx) — extracted from QR Board; `data-fit-width` + legacy `data-qr-board-fit` |
| QR Card / Action Card | Design `width` + `height` on export root; FitWidth parent scales sheet; `wallet*` type on `previewWidthPx` |
| Branding | Mark logo on compact sizes; one truncated local-label line on Letter when Show URL (no Board header-only chrome) |
| Square link cards | Smaller `qrPlatePercent` (24/26%); title line-clamp; copy column `min-h-0 overflow-hidden` — see B12 |
| Helpers | `qrCardPreviewHeightPx()` in [`qr-card-sizes.ts`](../../src/lib/constants/qr-card-sizes.ts) |
| Tests | QR share: square 5×5 geometry, Letter @ 390px FitWidth box, Action Card quarter + Letter |

---

## Hard lessons (do not re-learn)

### B1. Do not size a square with the same `%` on width and height

`min(72%, 140px)` on **both** axes uses different containing-block axes → a tall rectangle. The QR `img` then `object-contain`s into a tiny module in a huge white plate.

### B2. Do not put `max-h-full` + `object-contain` on the QR `<img>` inside a non-square plate

**Fixed:** `CanvasQrPlate` no longer sets `maxHeight: 100%`. Prefer an explicit square parent (`width` + `aspect-ratio: 1` or equal px box) and let the image fill that square.

### B3. `container-type: size` / `cqw` on a `flex-1` slot can collapse to 0

Board uses computed `platePx` at design width + uniform CSS `scale` of the whole sheet. Do not reintroduce cqw on flex-1 cells without a failing test.

### B4. `max-height` on a plate without shrinking width → wide flat rectangles

If height is capped and width stays `%`, you lose the square. Transfer the constraint to both axes or use uniform scale of the poster.

### B5. Overlap tests must clip URL rects to `[data-qr-cell]`

`overflow: hidden` clips paint, but `getBoundingClientRect()` still overflows. Clip the URL box to the cell before testing overlap with the plate or footer. Implemented in `canvas-layout-geometry.ts` and duplicated inside Playwright `evaluate()` — **keep in sync**.

### B6. Display typeScale is a poster footgun

Brand Kit `typeScale: "display"` is loud on purpose for Graphic/Flyer heroes. Fatal on a letter grid of four QRs. Board caps typeScale at 1 inside `qrBoardChrome`. **Do not “fix” Flyer/Graphic display headlines looking big — that is product intent.**

### B7. Footer band vs header lockup

`includeBranding: themeEstablished` turns **on** after Brand Kit onboarding (e2e `seedCanvasFonts` sets `typeScale: "display"`). Dense canvases need compact header/mark branding — not a second full-width footer band.

### B8. Preview vs export scale

`width: previewWidthPx; maxWidth: 100%` shrinks the box while fonts stay at design px → crop. Board’s `FitWidthFrame` scales the **parent** of `[data-export-root]`. Export stays unscaled: `capture.ts` sets `clonedRoot.style.transform = "none"`.

### B9. Playwright / Brand Kit seed pitfalls

- Expand **Options** `<details>` before “Show URL”.
- Deep-link `?preset=` races the dropdown — assert `#qr-preset` / label value after seed.
- `seedCanvasFonts` enables loud chrome — tests that skip it miss footer/type bugs.
- **`waitForQrPreview`:** use `offsetWidth` / `naturalWidth`, not `getBoundingClientRect()` — parent CSS scale (mobile Preview tab) shrinks visual rects without meaning the QR failed.
- PowerShell: quote `--grep "@smoke"`.

### B10. Reference vs link QR Card — different square strategies

**Reference** presets (`rightToRefuse`) pack dense copy + branding. They need an **explicit px square wrapper** around `CanvasQrPlate` and line-clamped description.

**Link** presets (`getSupport`) must render `CanvasQrPlate` **directly** with `widthPercent`. Wrapping link layout in the same `%`-width div **broke flex shrink** — QR vanished on quarter (tagline + URL visible, no plate).

**Rule:** square wrapper only when `referencePlatePx` is set.

### B11. `platesOutsideRoot` uses layout offsets, not scaled bounding rects

After FitWidth, `getBoundingClientRect()` on plates lies. Compare `offsetLeft + offsetWidth` to `root.offsetWidth` for crop detection inside the export root.

### B12. Wallet FitWidth needs explicit design height on the export root

`aspectRatio` + `maxWidth: 100%` shrinks the box while type stays at design px. FitWidth fixes Letter/tabloid **width** overflow, but the export root must also get **`width: previewWidthPx` + `height: qrCardPreviewHeightPx(size)`** (or equivalent) so `platesOutsideRoot` asserts match a fixed sheet. Do not rely on aspect-ratio alone once FitWidth wraps the card.

### B13. Square wallet cards are a fixed square sheet — budget copy, don't center the stack

On 5×5 / 4×4 (~240px), `includeBranding` + display typeScale + header local label can push the QR past the export root (`platesOutsideRoot: 1`). Fixes that worked:

- Copy column: `min-h-0 overflow-hidden` (not `shrink-0` only) so flex can shrink copy before the plate.
- Title: `-webkit-line-clamp: 2` on square link cards.
- Link presets: lower `qrPlatePercent` on squares (24/26%, not 28/30%).
- Keep `justify-start` + `mt-auto` on the QR block — **do not** `justify-center` the whole flex column on square link cards.

Reference presets still use explicit `referencePlatePx` square wrapper (B10).

### B14. FitWidth smoke selector

Shared wrapper sets **`data-fit-width`** and **`data-qr-board-fit`** (Board backward compat). `measurePreviewFit` and Letter @ 390px tests should query `[data-fit-width]`.

---

## Tool matrix — what CI covers vs what it does not

| Tool | Layout-class coverage | Geometry asserts | Gaps / notes |
|------|----------------------|------------------|--------------|
| **QR Board** | All 4 presets + tabloid + 390px 4-up | Plate aspect/fill, URL overlap, column fit | Tabloid **export** PNG full sheet not smoke-tested (preview only) |
| **QR Card** | `getSupport` + `rightToRefuse`; quarter + Letter + square 5×5 + 390px Preview | Plate + URL; FitWidth on all sizes | Not all 10 preset ids — geometry is link vs reference × quarter vs Letter vs square |
| **Action Card** | `signPetition`; quarter + Letter | Plate + URL; FitWidth | Single preset — geometry class only |
| **Flyer** | 4 presets via `?preset=`; rally @ 390px | QR plate when `showQr`; column fit | `walkabout` has no QR by design |
| **Graphic Maker** | 4 TOOL_PRESETS → notice/solidarity/spotlight layout | Column fit only | Type-first; no QR plate geometry |
| **Solidarity** | stack / split / banner slogans + 16:9 digital | Plate + column fit | Landscape QR 40–48px is **by design** |
| **Meeting Background** | One preset; Bold lower-third → Minimal footer | Column fit only | Not every layout id per design set |
| **Quote Card** | Default | Column fit | Type-first |
| **Board Notice / Banner** | Default; banner header mode | Column fit | Strip type overflow edge cases not geometry-tested |
| **Pulse Poll** | Default when Hub-reachable | Column fit | **Skips** if demo login / route unavailable |
| **Share Kit** | — | — | **Non-goal** — orchestrator; Graphic `?preset=` is downstream |

Constants: [`layout-class-matrix.ts`](../../src/lib/comms/layout-class-matrix.ts).

---

## Fit gaps & missing items (residual)

These are **not blockers** for the layout-class pass — record before an agent “fixes” them as bugs.

| Gap | Severity | Why it remains | Suggested follow-up |
|-----|----------|----------------|---------------------|
| **Pulse Poll smoke skips without Hub** | Medium for CI | Publish gate + demo officer login; smoke skips when unreachable | Durable smoke env with seeded officer, or document as `@export`-only |
| **Wallet tools lack FitWidthFrame** | **Closed** `53cb63b` | Shared `FitWidthFrame` on QR Card + Action Card | Keep `wallet*` helpers on design `previewWidthPx`; square sheets need B12–B13 |
| **Square wallet copy overflow** | **Closed** `53cb63b` | line-clamp + overflow-hidden copy column + smaller plate % | Re-test if new square presets add long copy |
| **Tabloid export not in smoke** | Low | Preview fit asserted; export integrity covered separately by `@export` fidelity suite | Optional: one tabloid PNG size floor in `tools.export.smoke.spec.ts` |
| **Meeting Background layout IDs** | Low | One preset + design-set switch proves class; not exhaustive | Add rows only if a facilitator reports a specific layout crop |
| **Board Banner strip overflow** | Low | `clampTypeRem` / vmin — different problem than QR grid | Human visual pass on longest local number + tagline |
| **Graphic / Quote type-first** | N/A | No QR grid; column fit is the right bar | Do not add QR plate asserts “for parity” |
| **Duplicate evaluate math** | Maintenance | Playwright cannot pass functions into `page.evaluate()` | When changing thresholds, update **both** `canvas-layout-geometry.ts` and `canvas-layout.ts` comment |
| **All 10 QR Card presets** | N/A (non-goal) | Copy variants share geometry | Keep link + reference × quarter + Letter |
| **Share Kit canvas** | N/A (non-goal) | No export root | Graphic Maker preset path is sufficient |
| **Flyer `?preset=` was missing** | **Closed** | Deep link only existed on some tools | Fixed `2785ddc` |
| **Session F1/F2 distill** | **Closed** | This file + `comms-visual-system.mdc` addendum | Wallet pass lessons B12–B14 added `53cb63b` |

### Next steps (optional — not blockers)

| Goal | Priority | Notes |
|------|----------|-------|
| Pulse Poll durable `@smoke` | Medium | Hub login / publish gate — smoke skips today |
| Tabloid Board export PNG floor | Low | Preview fit covered; add one `@export` size assert if facilitators ask |
| Meeting Background per-layout rows | Low | Only if a specific layout crops in the field |
| Board Banner longest local # visual | Low | `clampTypeRem` — human pass, not QR geometry |

---

### Explicit non-goals (locked)

- Rewrite Flyer/Graphic display type for Board parity.
- Turn `includeBranding` off by default after onboarding.
- Collapse tools into one layout engine / port `qrBoardChrome` everywhere.
- Test all 10 QR Card preset ids.
- Add Share Kit canvas coverage.

---

## Verify commands

```bash
npm run lint
npm run test:unit -- src/lib/comms/layout-class-matrix.test.ts src/lib/utils/canvas-layout-geometry.test.ts src/lib/constants/qr-board.test.ts src/lib/comms/flyer-maker.test.ts
npx playwright test e2e/tools.qr-share.smoke.spec.ts e2e/tools.layout-matrix.smoke.spec.ts --grep "@smoke"
```

Windows PowerShell: quote `"@smoke"`. Prefer live `npm run dev` + `PLAYWRIGHT_BASE_URL=http://localhost:3000`.

Pass thresholds (shared constants):

- Plate aspect: 0.85–1.2 (`PLATE_ASPECT_MIN` / `PLATE_ASPECT_MAX`)
- QR fill inside plate: > 0.65 (`PLATE_FILL_MIN`)
- URL overlap with plate: 0 (clip to cell first)
- Export root crop: 0 plates outside root/cell
- Preview visual width ≤ column width (+2px epsilon)

---

## Agent pitfalls

1. **Board density:** 4-up is `regular`, not `roomy`. Collapsing 4 URL slots into 2-up chrome was the original bug.
2. **Do not wrap all QR Card plates** in a `%`-width div — reference-only square wrapper.
3. **Assert preset after seed** — `?preset=` and dropdown race on first paint.
4. **Meeting Background Minimal** — layout radio label is `"Footer: bottom lockup"`; use `expect.poll` after Design switch.
5. **Mobile Preview tab** — open Preview tab before geometry asserts at 390px; Edit tab layout differs.
6. **When adding a new preset to smoke** — add id to source constants **and** `layout-class-matrix.ts`; Vitest guard will fail if mismatched.
7. **Square wallet + FitWidth** — explicit design height on export root (B12); never `justify-center` the whole square link stack (B13).

---

## Key files

| File | Role |
|------|------|
| [`qr-board-formats.ts`](../../src/lib/constants/qr-board-formats.ts) | Density, chrome, plate px |
| [`QrBoardCanvas.tsx`](../../src/components/tools/qr-board/QrBoardCanvas.tsx) | Board layout; imports shared FitWidthFrame |
| [`FitWidthFrame.tsx`](../../src/components/tools/FitWidthFrame.tsx) | Uniform preview scale parent of export root |
| [`canvas/index.tsx`](../../src/components/tools/canvas/index.tsx) | `CanvasQrPlate`, `CanvasUrlCaption` |
| [`qr-card/page.tsx`](../../src/app/[locale]/tools/qr-card/page.tsx) | FitWidth + reference square wrapper + square copy budget |
| [`action-card/page.tsx`](../../src/app/[locale]/tools/action-card/page.tsx) | FitWidth + compact wallet branding |
| [`flyer-maker/page.tsx`](../../src/app/[locale]/tools/flyer-maker/page.tsx) | `?preset=` deep link |
| [`capture.ts`](../../src/lib/export/capture.ts) | Export unscale (`transform: none`) |
