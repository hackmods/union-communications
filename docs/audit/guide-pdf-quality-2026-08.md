# Guide / training PDF quality (2026-08)

Inventory, quality bar, and remediations for **client text PDFs** used by public guides and Officer Learning. Canvas Comms tool PDFs (`pdf-export.ts`) stay under Phase 9 — see [`COMMS_VISUAL_SYSTEM.md`](../modules/COMMS_VISUAL_SYSTEM.md).

Agent rule: [`.cursor/rules/guide-pdfs.mdc`](../../.cursor/rules/guide-pdfs.mdc).

## Inventory

| Bucket | Generator | Platform branding | Tests |
|--------|-----------|-------------------|-------|
| OL pocket sheets, floor checklists, bylaws sheets | [`src/lib/officer-learning/reference-pdf.ts`](../../src/lib/officer-learning/reference-pdf.ts) via [`text-pdf-layout.ts`](../../src/lib/export/text-pdf-layout.ts) | UnionOps interlock mark + education footer | unit + `e2e/guide-pdf.export.smoke.spec.ts` |
| OL certificates | [`src/lib/officer-learning/certificate.ts`](../../src/lib/officer-learning/certificate.ts) | UnionOps mark + optional Brand Kit logo | `certificate.test.ts` + layout helpers |
| Steward workspace PDF | [`src/lib/steward-guides/export.ts`](../../src/lib/steward-guides/export.ts) | Same text-PDF chrome | guide-pdf smoke (workspace export) |
| Canvas tool PDFs | [`src/lib/export/pdf-export.ts`](../../src/lib/export/pdf-export.ts) | Brand Kit via DOM capture | `tools.export.smoke` / `test:export` |
| Ontario ministry posters | `public/assets/ontario-board-posters/*.pdf` | Third-party (do not rebrand) | `board-materials.test.ts` |

### Module → pocket PDF map

| Module / guide | Sheet IDs / exports |
|----------------|---------------------|
| contract-enforcement | `far-sheet`, `floor-checklist` |
| progressive-discipline | `discipline-rights`, `floor-checklist` |
| human-rights-accommodation | `meiorin-sheet`, `floor-checklist` |
| democratic-governance | `quorum-motion`, `floor-checklist` |
| financial-health | `audit-controls`, `floor-checklist` |
| building-collective-power | `equity-clause`, `floor-checklist` |
| `/guide/bylaws` | adoption checklist, quorum/motion |
| `/guide/land-acknowledgement` | writing worksheet (`writeBrandedWorksheetPdf`, `layoutMode: flow`, 8 draft + 2 reflect rows, footer flows after Step 4) |

### Worksheet engine (`writeBrandedWorksheetPdf`)

Engine code: [`src/lib/export/pdf-layout/`](../../src/lib/export/pdf-layout/). Spec: [`GUIDE_PDF_LAYOUT.md`](../modules/GUIDE_PDF_LAYOUT.md).

Use for **pen-and-paper floor handouts** where stewards write in ruled space (not checkbox-only checklists).

| Primitive | Purpose |
|-----------|---------|
| `field` / `fieldInline` | Label + ruled underline, full width |
| `fieldPair` | Two half-width fields on one row |
| `ruled` + `count` | Fixed note rows (preferred for floor handouts) |
| `ruled` + `fill: true` + `maxRows` | Expanding draft — **once per sheet**, always cap |
| `check` / `checkPair` | Review checklist items |
| `table` | Header row + ruled body rows |
| `columnLayout` | 2–3 side-by-side columns |
| `pageBreak` | Multi-page when `allowMultiPage: true` |
| `closingSections` | Sign-off pinned above footer (`layoutMode: pinnedClosing`) |
| `tips` + `reminder` | Floor copy above education footer |

**Layout modes:** `flow` (land ack) · `pinnedFooter` (fill draft) · `pinnedClosing` (sign-off pin).

**Header:** mark → title → accent rule → subtitle. **Footer band:** tips → bullets → reminder → disclaimer (top-down).

Pre-flight: `layoutWorksheet()`. Preview: `npm run pdf:preview -- land-acknowledgement en`.

Reference: [`land-acknowledgement-worksheet-pdf.ts`](../../src/lib/comms/land-acknowledgement-worksheet-pdf.ts).

### jsPDF exceptions (canvas raster + landscape certificate)

| Path | Notes |
|------|-------|
| `src/lib/export/pdf-export.ts` | Canvas raster — intentional |
| `src/lib/officer-learning/certificate.ts` | Landscape cert — shares mark/fonts |

Hub travel, expense, and time rollup PDFs now use `createHubInternalReportPdfBlob` (shared chrome).

Also exported as `PDF_ENGINE_STRAGGLERS` from `pdf-layout/index.ts`.
| Certificates | module + path via `downloadOfficerLearningCertificate` |

## Quality bar

1. **Platform mark** — header embeds [`UNIONOPS_LOGOS.markInterlock`](../../src/lib/constants/unionPresets.ts) (`/assets/unionops/logo-mark-interlock.png`). Wordmark-only Helvetica `UNIONOPS` is a fallback when mark bytes fail, not the primary brand signal.
2. **Education footer** — always names UnionOps + “education only / not legal advice” (EN + FR).
3. **Hierarchy** — title → sections/checkboxes → footer; letter page, ~10–12 pt body.
4. **Palette + typefaces** — Brand Kit primary accent when provided; headline/body OFL TTFs via `registerGuidePdfFonts` (system faces → Helvetica). Fallback accents: `GUIDE_PDF_PALETTE`.
5. **Local label** — subtitle includes Brand Kit local number when the caller passes it.
6. **Locale** — public printables follow UI `en` | `fr`; FR claim matches EN.
7. **Filenames** — stay `unionops-*.pdf`.
8. **Contrast** — dark ink on white for floor sheets; certificates may use dark ground + light ink.
9. **No empty PDFs** — smoke asserts size floor, `numPages >= 1`, expected title/footer text, and an embedded image for the mark.

## Manual review checklist

Generate EN + FR samples (`npm run test:unit -- src/lib/export/guide-pdf-review.test.ts` → `test-results/guide-pdf-review/`) and check against the bar:

- [x] FAR sheet
- [x] Discipline rights
- [x] Meiorin sheet
- [x] Quorum / motion
- [x] Audit controls
- [x] Equity clause
- [x] Bylaws adoption checklist
- [x] One floor checklist
- [x] Module certificate
- [x] Path certificate (same certificate writer; module path exercised)
- [x] One steward workspace PDF

## Out of scope

- Rebranding Ontario ministry PDFs
- Changing canvas Comms PDF pipeline or Phase 9 thresholds
- Server-side PDF generation
- OOXML binary font embed (Project B3 — see [`future-pdf-and-docx-engines-2026-08.md`](future-pdf-and-docx-engines-2026-08.md))

## Verify

```bash
npm run test:unit -- src/lib/export/pdf-layout.test.ts src/lib/export/text-pdf-layout.test.ts src/lib/export/worksheet-pdf-test-helpers.test.ts src/lib/export/guide-pdf-contract.test.ts src/lib/comms/land-acknowledgement-worksheet-pdf.test.ts src/lib/officer-learning/certificate.test.ts
npm run pdf:preview -- land-acknowledgement en
npx playwright test e2e/guide-pdf.export.smoke.spec.ts
```
