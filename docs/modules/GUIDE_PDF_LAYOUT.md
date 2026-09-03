# Guide PDF layout engine

Authoritative reference for **text PDF** worksheets and shared chrome. Canvas Comms PDFs stay on `pdf-export.ts` (raster). Inventory: [`docs/audit/guide-pdf-quality-2026-08.md`](../audit/guide-pdf-quality-2026-08.md).

## Architecture

```
src/lib/export/text-pdf-layout.ts     — public API (writers + re-exports)
src/lib/export/pdf-layout/            — layout engine (phases 0–6)
  constants.ts                        — palette, margins, page sizes
  guide-header.ts                     — mark → title → rule → subtitle
  guide-footer-band.ts                — tips → reminder → disclaimer (top-down)
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
| `field` / `fieldPair` | Inline label + rule |
| `ruled` + `count` | Fixed note rows |
| `ruled` + `fill` + `maxRows` | Expanding draft (once per sheet) |
| `check` / `checkPair` | Review checklist |
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
# → test-results/pdf-preview/ + layout budget JSON on stdout
```

## Tests

- `src/lib/export/pdf-layout.test.ts` — validate, budget, builder, golden spatial contracts
- `src/lib/export/guide-pdf-contract.test.ts` — cross-family regression
- `src/lib/comms/land-acknowledgement-worksheet-pdf.test.ts` — template contract
- `e2e/guide-pdf.export.smoke.spec.ts` — browser download smoke

Spatial helpers: `expectBlockOrder`, `expectFooterBandOrder`, `expectMinVerticalGap` in `worksheet-pdf-test-helpers.ts`.

## jsPDF stragglers (not yet on shared chrome)

See `PDF_ENGINE_STRAGGLERS` in `src/lib/export/pdf-layout/index.ts` — travel, time rollup, expenses exports. Migrate when those surfaces need Brand Kit chrome.

## Header contract (all text PDF families)

**Logo → title → accent rule → subtitle/instructions** — never draw the rule through the title.

## Footer band contract (worksheets with tips)

**Tips heading → bullets → reminder → education disclaimer** — always top-down.
