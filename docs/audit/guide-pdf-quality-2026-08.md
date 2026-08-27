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
| Certificates | module + path via `downloadOfficerLearningCertificate` |

## Quality bar

1. **Platform mark** — header embeds [`UNIONOPS_LOGOS.markInterlock`](../../src/lib/constants/unionPresets.ts) (`/assets/unionops/logo-mark-interlock.png`). Wordmark-only Helvetica `UNIONOPS` is a fallback when mark bytes fail, not the primary brand signal.
2. **Education footer** — always names UnionOps + “education only / not legal advice” (EN + FR).
3. **Hierarchy** — title → sections/checkboxes → footer; letter page, ~10–12 pt body.
4. **Palette** — shared navy / teal / amber accents from `GUIDE_PDF_PALETTE` in `text-pdf-layout.ts` (not full Brand Kit typefaces in text PDFs).
5. **Local label** — subtitle includes Brand Kit local number when the caller passes it.
6. **Filenames** — stay `unionops-*.pdf`.
7. **Contrast** — dark ink on white for floor sheets; certificates may use dark ground + light ink.
8. **No empty PDFs** — smoke asserts size floor, `numPages >= 1`, expected title/footer text, and an embedded image for the mark.

## Manual review checklist

Generate EN (+ FR where localized) samples and check against the bar before merge:

- [ ] FAR sheet
- [ ] Discipline rights
- [ ] Meiorin sheet
- [ ] Quorum / motion
- [ ] Audit controls
- [ ] Equity clause
- [ ] Bylaws adoption checklist
- [ ] One floor checklist
- [ ] Module certificate
- [ ] Path certificate
- [ ] One steward workspace PDF

## Out of scope

- Rebranding Ontario ministry PDFs
- Changing canvas Comms PDF pipeline or Phase 9 thresholds
- Server-side PDF generation
- Embedding Brand Kit OFL typefaces into text PDFs (Helvetica + mark PNG)

## Verify

```bash
npm run test:unit -- src/lib/export/text-pdf-layout.test.ts src/lib/officer-learning/certificate.test.ts
npx playwright test e2e/guide-pdf.export.smoke.spec.ts
```
