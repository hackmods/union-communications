# Plan — QR Board canvas QOL + sibling tool pass (2026-08-17)

**Audience:** Ryan (deep-test round) + future agents.  
**Status:** QR Board shipped; sibling tools **not** auto-ported — work through the checklist, then distill lessons.  
**Companion:** [`COMMS_VISUAL_SYSTEM.md`](../modules/COMMS_VISUAL_SYSTEM.md), [`.cursor/rules/comms-visual-system.mdc`](../../.cursor/rules/comms-visual-system.mdc), [`session-knowledge-2026-08-14-flyer-unified-tools.md`](session-knowledge-2026-08-14-flyer-unified-tools.md), [`session-knowledge-2026-08-15-canvas-fonts.md`](session-knowledge-2026-08-15-canvas-fonts.md).

**Do not port the QR Board pack across the toolkit.** The failure was **several QR codes on one letter sheet**. Most other tools are a single canvas. Same *class* of bugs can still appear (Letter + branding + `maxWidth: 100%` without uniform scale) but they are milder and show up in different places.

---

## How to use this file

1. Work the **deep-test checklist** (Part D) while clicking tools.
2. Record pass / fail / notes in the Status column.
3. Only then implement sibling fixes (Part E) if a tool actually failed.
4. Distill locked lessons into Cursor rules + a session-knowledge file (Part F). Do not write those until the test round is done — this plan is the holding tank.

When a row is done, mark it `[x]` and one-line the result. Do not delete rows.

---

## Part A — What already shipped (QR Board)

Landed on `main`:

| Commit | What |
|--------|------|
| `93f27b9` | Keep destination URLs readable below plates (`formatCanvasDisplayUrl`, wrap not truncate, plate `z-index` removed) |
| `75df645` | Size plates as filled squares (`qrBoardPlatePx`); captions in document flow |
| `89fccbb` | Compact type, header branding (no footer band), FitWidth preview scale, 4-up treated as **regular** density, preset + 390px smoke |

**Product outcome:** `/tools/qr-board` lays out at letter/tabloid design size, then scales the whole sheet to the preview column. Local branding is a small header line (mark logo on 4-up / 6-up). Core links (4 URL) plates stay ≥ ~80 CSS px on letter — larger than 6-up, smaller than 2-up.

### Key files (as-built)

| File | Role |
|------|------|
| [`src/lib/constants/qr-board-formats.ts`](../../src/lib/constants/qr-board-formats.ts) | `qrBoardDensity` / `qrBoardChrome` / `qrBoardPlatePx` |
| [`src/components/tools/qr-board/QrBoardCanvas.tsx`](../../src/components/tools/qr-board/QrBoardCanvas.tsx) | Compact chrome, header local label, `FitWidthFrame` |
| [`src/lib/utils/canvas-url.ts`](../../src/lib/utils/canvas-url.ts) | Display URL + `boardUrlFontSizePx` (typeScale capped at 1) |
| [`src/components/tools/canvas/index.tsx`](../../src/components/tools/canvas/index.tsx) | `CanvasQrPlate`, `CanvasUrlCaption` |
| [`e2e/tools.qr-share.smoke.spec.ts`](../../e2e/tools.qr-share.smoke.spec.ts) | All board presets uncropped + 390px 4-up |

**Presets** ([`qr-board-presets.ts`](../../src/lib/constants/qr-board-presets.ts)): `membershipFtPt` (2), `twoCampaigns` (2), `coreLinks` (4), `fullBoard` (6).

**Density (locked for Board):** ≤2 `roomy`, ≤4 `regular`, else `compact`. Four URLs used to share 2-up chrome, which left plates ~36px. That is the 4-up bug — do not collapse 4-up into “roomy” or “dense ≥6” again.

**Verify:**

```bash
npm run test:unit -- src/lib/constants/qr-board.test.ts src/lib/utils/canvas-url.test.ts
npx playwright test e2e/tools.qr-share.smoke.spec.ts --grep "@smoke"
```

On Windows PowerShell quote the grep: `--grep "@smoke"`. Prefer a live `npm run dev` + `PLAYWRIGHT_BASE_URL=http://localhost:3000`.

---

## Part B — Hard lessons (do not re-learn)

These bit QR Board twice in 24 hours. They apply to **any** multi-cell or flex QR canvas, not only Board.

### B1. Do not size a square with the same `%` on width and height

`min(72%, 140px)` on **both** axes uses different containing-block axes → a tall rectangle. The QR `img` then `object-contain`s into a tiny module in a huge white plate.

### B2. Do not put `max-h-full` + `object-contain` on the QR `<img>` inside a non-square plate

The plate stays tall; the code collapses. Prefer an explicit square (`width` + `aspect-ratio: 1` or equal `width`/`height`) and let the image fill that square (`w-full h-auto` or `object-contain` only inside an already-square box).

### B3. `container-type: size` / `cqw` on a `flex-1` slot can collapse to 0

Size containers cannot depend on children; some flex-1 slots reported 0 and plates vanished. Board now uses **computed `platePx` at design width** plus **uniform CSS `scale` of the whole sheet**. Do not reintroduce cqw on flex-1 cells without a failing test first.

### B4. `max-height` on a plate without shrinking width → wide flat rectangles

If height is capped and width stays `%`, you lose the square. Transfer the constraint to both axes or use uniform scale of the poster.

### B5. Overlap tests must clip URL rects to `[data-qr-cell]`

`overflow: hidden` clips paint, but `getBoundingClientRect()` still overflows. Clip the URL box to the cell before testing overlap with the plate or footer.

### B6. Display typeScale is a poster footgun

Brand Kit `typeScale: "display"` is `titleFontSizePx: 36` × `typeScaleFactor` **1.1**. Fine on a Graphic Maker / Flyer hero. Fatal on a letter grid of four QRs. Board **caps typeScale at 1** inside `qrBoardChrome` / `boardUrlFontSizePx`. Wallet helpers (`walletTitleFontSizePx`) already multiply by `walletWidthRatio(previewWidthPx)` — they scale to **design** width, not the shrunk `maxWidth: 100%` box.

### B7. Footer band vs header lockup

`includeBranding: themeEstablished` turns **on** after Brand Kit onboarding (e2e `seedCanvasFonts` does this). A full-width canvas footer + lockup ate the grid. Board moved the local label into the header (`data-board-footer` still exists for tests) and uses **mark** logo when density ≠ roomy. Do not confuse this with `ToolRelatedFooter` (page chrome below the editor).

### B8. Responsive preview = scale the sheet, do not reflow px chrome

`width: previewWidthPx; maxWidth: 100%` shrinks the box while fonts stay at design px → crop. Board’s `FitWidthFrame` lays out at design size, then `transform: scale(...)` to the column. **Export stays unscaled:** `capture.ts` sets `clonedRoot.style.transform = "none"` and uses `offsetWidth` (layout size, not visual). Put scale on a **parent** of `[data-export-root]`, never on the capture node.

`MobilePreviewStage` already scales **mobile** mini/full preview. Desktop `passthrough` is where Letter/tabloid overflow happens.

### B9. Playwright / Brand Kit seed pitfalls

- Expand **Options** `<details>` before “Show URL”.
- Deep-link `?preset=` is applied in `useOneShotBrandSeed` — selecting the dropdown can lose the race; assert the label value after seed.
- `seedCanvasFonts` sets `typeScale: "display"` and onboarding complete → branding on. Tests that ignore this will not catch footer/type bugs.
- PowerShell: quote `--grep "@smoke"`.

---

## Part C — Why other tools are not automatic copies

| Tool | Same bug class? | Why / why not |
|------|-----------------|---------------|
| **QR Card / Action Card** | Partial | Same `includeBranding` default + local-label **line** at bottom. Default size is **quarter** (~204px) — usually fine. **Letter** preview is ~408px (`8.5 × 48`) with `maxWidth: 100%` and no FitWidth — narrow desktop columns can squash without scaling type. Single QR + `justify-between` so the footer cannot nuke a 2×2 grid. `wallet*` helpers already scale type by design width. |
| **Solidarity Poster** | Watch | Landscape chrome already budgets short previews (`qrPx` 40–72). Portrait type is large on purpose (`text-4xl` / `text-5xl`). Watch **stack + branding + QR on 16:9**. |
| **Flyer Maker** | Skip for parity | Brand Kit header (logo + local line) is intended. Display type is a print choice. Aug 14 QOL already targeted this tool. Watch QR-on-flyer layouts only, not Board footer. |
| **Graphic Maker / Quote Card / Pulse Poll** | Unlikely | Graphic preview type is ~0.72 of canvas title (`layoutChrome`). Pulse uses `walletTitleFontSizePx`. |
| **Board Banner / Notice / Trim** | Skip | `clampTypeRem` / vmin against strip height — different problem. |
| **Meeting Background** | Skip this pass | Wallpaper + `includeBranding`; not a QR grid. |
| **Share Kit** | Skip | Orchestrator, no canvas. |

**Nothing else lays out 2×2 or 2×3 QR codes.** Do not add font pickers, FitWidth, or header-only branding “for parity.” Flyer is still the Print reference, not the typography mandate ([session-knowledge-2026-08-14](session-knowledge-2026-08-14-flyer-unified-tools.md) lesson 2).

**Shared footgun still in `CanvasQrPlate`:** `maxHeight: 100%` + `aspect-ratio: 1` + `%` width. Harmless when the parent is already square (Board). Dangerous when the parent is a tall flex slot (the 2026-08-17 morning screenshot).

---

## Part D — Deep-test checklist

Test after Brand Kit onboarding (or with e2e seed) so **Include branding** is on. Toggle it off only to compare, not as the only pass.

For each row: default size first, then the **largest paper / Letter**, then ~390px width (Preview tab on phone chrome).

| # | Surface | What to look for | Status |
|---|---------|------------------|--------|
| D1 | QR Board `?preset=membershipFtPt` | 2-up squares fill plates; local label in **header**; URLs wrap below | [x] shipped `89fccbb` |
| D2 | QR Board `?preset=coreLinks` | 4-up codes not tiny (~80px+ on letter preview); no crop | [x] shipped `89fccbb` |
| D3 | QR Board `?preset=fullBoard` | 6-up still scannable; Ontario URLs readable, no `https://` | [x] shipped `89fccbb` |
| D4 | QR Board `?preset=twoCampaigns` | Same as 2-up membership | [x] covered by preset loop |
| D5 | QR Board tabloid | FitWidth scales; export PNG still full sheet | [ ] |
| D6 | QR Card **quarter** (default) + Show URL + branding | URL below QR, not truncated; footer one line | [ ] |
| D7 | QR Card **Letter** + branding + Show URL | No crop in desktop preview column; type not overflowing QR | [ ] |
| D8 | Action Card quarter + Letter (same as D6–D7) | Same | [ ] |
| D9 | Solidarity **stack** letter + branding + QR | Header/footer vs QR; type still poster-scale | [ ] |
| D10 | Solidarity **16:9 / wide** + branding | Short preview still fits; QR may be small **by design** (40–48px) | [ ] |
| D11 | Flyer layout with QR on | Plate square; does not cover body type | [ ] |
| D12 | Graphic Maker notice / results | Preview type already reduced — only log if crop/QR clash | [ ] |
| D13 | Quote Card / Pulse Poll | Type-first; skip unless crop or branding eats the quote | [ ] |
| D14 | Board Banner / Notice | Skip unless strip type overflows | [ ] |

**Pass criteria (any QR canvas):**

- Plate aspect ~1 (0.85–1.2).
- QR image fill of plate > ~0.65.
- URL (`[data-canvas-url]`) does not overlap plate or header/footer (clip to cell).
- `[data-export-root]` content not clipped (`plates` inside root rect).
- Visual width ≤ preview column (FitWidth or equivalent).

**Fail that is *not* a Board clone:** Flyer/Graphic display headlines looking “big” on purpose; Solidarity landscape QR at 40px; branding checkbox on after onboarding (toggle exists).

---

## Part E — If a sibling fails (implementation order)

Only after a D-row fails. Smallest change that matches the failure:

1. **Crop on Letter / tabloid in a narrow column** → extract Board’s `FitWidthFrame` (or share it) around `[data-export-root]`. Do not reflow px type.
2. **Type eating a single-QR wallet card** → cap `typeScaleFactor` like Board, or feed **rendered** width into `wallet*` helpers (today they use design `previewWidthPx`).
3. **Footer fighting one QR** → move local label into the header **or** keep one line but shrink lockup to mark on compact sizes. Do not delete branding; it is opt-out via the existing checkbox.
4. **Tiny / non-square QR** → explicit square parent; never `%` height + `%` width; never `max-h-full` on the img unless the plate is already square.
5. **Tests** — extend `e2e/tools.qr-share.smoke.spec.ts` (wallet) or add a layout helper reused by Flyer QR. Assert presets/sizes that failed, not only defaults. Seed Brand Kit `display` so CI sees the loud chrome.

**Explicit non-goals**

- One layout engine / `ToolDesignControls` mega-component.
- Font pickers on Graphic / Quote / wallet “for parity.”
- Turning `includeBranding` off by default after onboarding (product intent).
- Changing Board Banner clamp math unless D14 fails.

---

## Part F — Distill after the test round

When D5–D14 are marked, write lessons **once** so agents stop rediscovering B1–B9.

### F1. Session knowledge (new file)

Create [`docs/audit/session-knowledge-2026-08-17-qr-canvas-layout.md`](session-knowledge-2026-08-17-qr-canvas-layout.md) in the usual shape: what shipped, hard lessons, tool matrix, verify commands, agent pitfalls. Then:

- Link it from [`current-ground-truth.md`](current-ground-truth.md) (session narrative list).
- Add it to [`AGENTS.md`](../../AGENTS.md) read-order item 7 (replace this plan pointer).
- One line in [`docs/PROGRESS.md`](../PROGRESS.md) if sibling tools also shipped.

### F2. Cursor rule (extend, don’t fork blindly)

Prefer a short addendum on [`.cursor/rules/comms-visual-system.mdc`](../../.cursor/rules/comms-visual-system.mdc) (already globs canvas tools) rather than a new always-on rule. Candidate bullets once testing confirms them:

```
- Multi-QR / dense posters: cap Brand Kit display typeScale; budget chrome in a shared helper
  (see qrBoardChrome). Do not apply Flyer/Graphic display titles to a letter grid.
- Square QR plates: explicit square box; never the same % on width and height; never
  max-h-full + object-contain on the img inside a non-square plate.
- Preview vs export: scale the sheet with transform on a parent of data-export-root;
  capture.ts strips transform on the clone. Do not shrink maxWidth and keep design px type.
- includeBranding after themeEstablished is on-purpose; keep it compact (header / mark),
  do not add a second full-width footer band on dense canvases.
- Layout overlap tests clip getBoundingClientRect to the cell; overflow:hidden is not enough.
```

Update [`docs/modules/COMMS_VISUAL_SYSTEM.md`](../modules/COMMS_VISUAL_SYSTEM.md) only if a primitive ships (shared `FitWidthFrame`, chrome helper used by QR Card, etc.).

### F3. Tests that should remain

Keep `e2e/tools.qr-share.smoke.spec.ts` looping **all** `QR_BOARD_PRESETS` plus a phone-width 4-up case. If QR Card Letter fails in D7, add a Letter+branding uncropped assertion — default quarter will not catch it.

---

## Part G — Agent / test harness notes

- Dev server: `npm run dev`; Playwright: `PLAYWRIGHT_BASE_URL=http://localhost:3000`.
- Brand Kit seed: [`e2e/helpers/canvas-fonts.ts`](../../e2e/helpers/canvas-fonts.ts) (`typeScale: "display"`).
- Export capture: [`src/lib/export/capture.ts`](../../src/lib/export/capture.ts) — `transform: none` on clone.
- Preview scale (mobile only): [`MobilePreviewStage.tsx`](../../src/components/tools/MobilePreviewStage.tsx) + [`preview-scale.ts`](../../src/lib/utils/preview-scale.ts).
- Wallet type: `walletTitleFontSizePx` / `walletBodyFontSizePx` / `walletMetaFontSizePx` in [`canvas-tokens.ts`](../../src/lib/utils/canvas-tokens.ts). Letter QR Card title ≈ `36 × 1.1 × 1` ≈ 40px on a 408×528 preview — OK on quarter via `walletWidthRatio`.

---

## Status summary

| Track | State |
|-------|--------|
| QR Board type / footer / 4-up / FitWidth / preset tests | **Shipped** `89fccbb` |
| Sibling deep-test (Part D) | **Open** — Ryan testing round |
| Sibling code (Part E) | **Blocked** on D failures |
| Session knowledge + Cursor rule (Part F) | **Blocked** on D (and E if any) |
