# Guide PDF layout engine

Authoritative reference for **text PDF** worksheets and shared chrome. Canvas Comms PDFs stay on `pdf-export.ts` (raster). Inventory: [`docs/audit/guide-pdf-quality-2026-08.md`](../audit/guide-pdf-quality-2026-08.md).

## Architecture

```
src/lib/export/text-pdf-layout.ts     — public API (writers + re-exports)
src/lib/export/pdf-layout/            — layout engine (phases 0–6)
  constants.ts                        — palette, margins, page sizes
  guide-header.ts                     — mark → title → rule → subtitle; header presets
  guide-mark.ts                       — platform mark draw + mark→title gap (all families)
  guide-footer-band.ts                — tips → reminder → disclaimer (top-down)
  worksheet-fields.ts                 — fieldPair/checkPair wrap + measure parity
  worksheet-validate.ts               — layout modes + validation
  worksheet-measure.ts                — measure == budget math
  worksheet-budget.ts                 — layoutWorksheet() pre-flight
  worksheet-builder.ts                — buildWorksheet() DSL
  worksheet-render.ts                 — render primitives + document
  vertical-flow.ts                    — Y cursor + pagination
  worksheet-types.ts                  — WorksheetLine / Section types
```

## Layout modes

| Mode | When | Footer | Body |
|------|------|--------|------|
| `flow` | Short handouts (land ack) | After content + gap | Full page minus footer reserve |
| `pinnedFooter` | Single `ruled` + `fill` draft block | Pinned to page bottom | Stops above footer + closing |
| `pinnedClosing` | Sign-off above tips | Pinned to page bottom | Main body flows; `closingSections` pinned above footer |

Set explicitly via `layoutMode` on `writeBrandedWorksheetPdf`, or omit to infer from sections.

**Validation** runs before render — invalid combinations throw (e.g. `flow` + `closingSections`, two `fill` blocks).

## Primitives

| Kind | Use |
|------|-----|
| `field` / `fieldPair` | Wrapped label + rule; side-by-side `row` by default, `layout: "stack"` optional |
| `ruled` + `count` | Fixed note rows with leading/trailing padding |
| `ruled` + `fill` + `maxRows` | Expanding draft (once per sheet) |
| `check` / `checkPair` | Wrapped checklist columns; `WORKSHEET_FIELD_BLOCK_LEADING` + rule trailing |
| `table` | Header row + ruled body rows |
| `columnLayout` | 2–3 side-by-side columns |
| `pageBreak` | Multi-page (`allowMultiPage: true`) |

## Author workflow

### Builder DSL

```ts
import { buildWorksheet, wsLine } from "@/lib/export/text-pdf-layout";

const spec = buildWorksheet("Floor handout")
  .subtitle("Local 243")
  .layoutMode("flow")
  .section("Step 3 — Draft", [wsLine.ruled(8, 16)], "Draft in your own words:")
  .tips("Floor tips", ["Territory first."])
  .reminder("Education only.")
  .build();

await writeBrandedWorksheetPdf({ ...spec, footer: COMMS_GUIDE_FOOTER.en, filename: "..." });
```

### Pre-flight budget

```ts
import { layoutWorksheet } from "@/lib/export/text-pdf-layout";

const budget = layoutWorksheet({ ...spec, footer: COMMS_GUIDE_FOOTER.en });
if (!budget.fitsOnePage) console.warn(budget.warnings);
```

### Manual preview

```bash
npm run pdf:preview -- land-acknowledgement en
npm run pdf:preview -- far-sheet en
npm run pdf:preview -- hub-travel en
```

## Tests

- `src/lib/export/pdf-layout.test.ts` — validate, budget, builder, golden spatial contracts
- `src/lib/export/guide-pdf-contract.test.ts` — cross-family regression
- `src/lib/comms/land-acknowledgement-worksheet-pdf.test.ts` — template contract
- `e2e/guide-pdf.export.smoke.spec.ts` — browser download smoke

Spatial helpers: `expectBlockOrder`, `expectFooterBandOrder`, `expectMinVerticalGap` in `worksheet-pdf-test-helpers.ts`.

## jsPDF exceptions

Hub travel, expense, and time rollup PDFs use `createHubInternalReportPdfBlob`. Remaining exceptions: canvas raster (`pdf-export.ts`) and landscape certificate — see `PDF_ENGINE_STRAGGLERS`.

## Header contract (all text PDF families)

**Logo → title → accent rule → subtitle/instructions** — never draw the rule through the title.

Platform mark placement and title start Y are centralized in `guide-mark.ts` via `drawGuidePlatformMark()`:

| Profile | Mark placement | Title gap constant |
|---------|----------------|-------------------|
| `worksheet` | Compact (margin-aligned) | `WORKSHEET_MARK_TITLE_GAP` (12pt) |
| `checklist` / `notes` | Officer Learning margin | `CHECKLIST_MARK_TITLE_GAP` (14pt) |

Do not hardcode `+ 5` or `+ 14` in writers — use the engine helper.

Field/checkbox columns use `worksheet-fields.ts` for both **render** and **budget measure** so long labels wrap instead of clipping at column edges.

## Spatial contracts (engine invariants)

These guard against the recurring layout failures (tight text under rules, empty right column):

| Invariant | Constant / helper | Enforced by |
|-----------|-------------------|-------------|
| Label below rule has breathable gap | `WORKSHEET_MIN_LABEL_GAP` (= rule trailing + block leading) | Render + measure share `WORKSHEET_FIELD_*` constants |
| Row-mode pairs use both columns | `worksheetPairColumnBounds()` | `expectPairUsesRowColumns()` in golden contract tests |
| Stack only when explicit | `resolvePairLayout()` defaults to `"row"` | `validateWorksheetLayout()` warns on unnecessary `layout: "stack"` |

**Do not** auto-stack pairs when labels wrap — `wrapPdfTextLines()` handles column bleed. Use `layout: "stack"` only when a full-width stack is intentional (e.g. extremely long single-column copy).

Spatial helpers live in `worksheet-pdf-test-helpers.ts`: `expectPairUsesRowColumns`, `expectMinFieldBlockGap`, `expectMinVerticalGap`.

## Footer band contract (worksheets with tips)

**Tips heading → bullets → reminder → education disclaimer** — always top-down.
