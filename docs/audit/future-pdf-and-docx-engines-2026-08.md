# Future goal — text PDF engine + Word/doc engine (2026-08)

Parked after guide/training PDF branding ([`guide-pdf-quality-2026-08.md`](guide-pdf-quality-2026-08.md)).  
Related: ADR-014 / [`session-knowledge-2026-08-15-canvas-fonts.md`](session-knowledge-2026-08-15-canvas-fonts.md), [`plan-2026-08-15-parked-followups.md`](plan-2026-08-15-parked-followups.md) (OOXML binary font embed still a non-goal until this project opens).

## Status (engines sequence 2026-08-27)

| Slice | Status |
|-------|--------|
| Labour guides chrome (2026-08-27) | **Shipped** (`07969f1`) — not part of this engine work; Guides-nav / print-depth remain deferred |
| Font TTF pipeline | **Shipped** (engines sequence 2026-08-27) |
| Project A — text PDF Brand Kit faces + FR parity | **Shipped** (engines sequence 2026-08-27) |
| Manual EN/FR print review | **Shipped** (engines sequence 2026-08-27) |
| Project B1 — Hub minutes/ballot Brand Kit DOCX | **Shipped** (2026-08-27) |
| B2 presets (seniority/grievance DOCX) | **Shipped** (2026-08-27) |
| B3 OOXML binary font embed (DOCX/PPTX) | **Shipped** (2026-08-27) |
| Worksheet fill-in PDF engine (`writeBrandedWorksheetPdf`) | **Shipped** (2026-09-03) — `fieldPair`, `checkPair`, `ruled` + `fill`, `closingSections`; see [`guide-pdf-quality-2026-08.md`](guide-pdf-quality-2026-08.md) |
| **Project A2 — PDF layout engine refactor (phases 0–6)** | **Shipped** (2026-09-03) — `pdf-layout/` modules, layout modes, `layoutWorksheet()`, builder DSL, table/column/pageBreak primitives, golden spatial tests, `npm run pdf:preview`; see [`GUIDE_PDF_LAYOUT.md`](../modules/GUIDE_PDF_LAYOUT.md) |

## Review — Brand Kit typefaces in text PDFs

**Prior decision (pre-engine sequence):** Guide and Officer Learning **text** PDFs used **Helvetica + UnionOps mark PNG**. That Helvetica-only rule is **lifted by Project A** in this sequence once the TTF pipeline lands.

| Path | Fonts today | Why |
|------|-------------|-----|
| [`text-pdf-layout.ts`](../../src/lib/export/text-pdf-layout.ts) | Helvetica | jsPDF built-in; no `addFont`; no Brand Kit face IDs |
| Canvas tool PDFs ([`pdf-export.ts`](../../src/lib/export/pdf-export.ts)) | Brand Kit OFL **rasterized** into JPEG page art | Preview DOM → html-to-image; not selectable PDF text |
| Website ZIP | OFL **woff2** embedded | [`loadCanvasFontBytes`](../../src/lib/comms/canvas-fonts.ts) |
| Document Generator DOCX/PPTX | Brand Kit **font names** only (`canvasFontOfficeName`) | Opens with system fallbacks if faces not installed |

**Why fonts are a separate project**

1. Repo ships **woff2** under `public/fonts/` (ADR-014). jsPDF needs **TTF/OTF** (or a reliable woff2→TTF step) per weight.
2. Text PDFs use a fixed `GUIDE_PDF_PALETTE`, not live Brand Kit colours — typeface embed without palette wiring would still look half-branded.
3. Canvas PDFs already look “on brand” because type is painted into the raster; changing text PDFs is a different product surface (selectable checklists, certificates, steward notes).
4. OOXML binary embed was explicitly parked (2026-08-15). Opening PDF font embed without a Word plan would fork the font pipeline twice.

**Acceptable interim quality:** Platform mark + education footer + Helvetica body. Revisit only when opening the engine projects below.

---

## Project A — Text PDF engine (Brand Kit faces + palette)

**Outcome:** Pocket sheets, floor checklists, bylaws sheets, certificates, and steward workspace PDFs use Brand Kit headline/body faces and palette accents while keeping UnionOps platform mark + education footer.

### Prerequisites

- [ ] Product sign-off to lift the Helvetica-only rule in [`guide-pdf-quality-2026-08.md`](guide-pdf-quality-2026-08.md) / [`guide-pdfs.mdc`](../../.cursor/rules/guide-pdfs.mdc)
- [ ] Font binary format decision: ship TTF/OTF alongside woff2, or convert at export time (license + bundle size check against ADR-014)
- [ ] Shared loader reused with Website ZIP (`loadCanvasFontBytes` or sibling that yields jsPDF-ready bytes)

### Build checklist

- [ ] jsPDF `addFont` path inside `text-pdf-layout.ts` (still dynamic-import jsPDF — `TOOL-004`)
- [ ] Wire `headlineFontId` / `bodyFontId` + Brand Kit palette into checklist/notes writers and certificates
- [ ] Weight rules aligned with canvas (`ZIP_WEIGHTS` / display faces at 600+)
- [ ] System faces (`systemSans` / `systemSerif`) stay Helvetica/Times fallbacks — no fake embed
- [ ] Migrate Hub straggler [`reports/export.ts`](../../src/lib/reports/export.ts) onto shared chrome if still Helvetica-only
- [ ] Tests: assert embedded font metadata (not only mark `paintImage`); EN/FR smoke still green
- [ ] Update quality bar + What's new when stewards can see Brand Kit type on floor sheets

### Non-goals for Project A

- Server-side PDF generation
- Replacing canvas `pdf-export.ts` Phase 9 raster path with vector text
- Rebranding Ontario ministry static PDFs

---

## Project B — Word / doc generation engine expansion

**Outcome:** Document Generator and Hub DOCX exports deepen Brand Kit fidelity and cover more steward/officer jobs; optional **binary** OFL embed so Word opens offline without installed catalog fonts.

### As-built today

| Capability | Status |
|------------|--------|
| DOCX/PPTX colours + PNG logo | Shipped ([`office-export.ts`](../../src/lib/export/office-export.ts), [`office-docx-builders.ts`](../../src/lib/export/office-docx-builders.ts)) |
| Font **names** from Brand Kit catalog | Shipped (`canvasFontOfficeName`) |
| OFL **binary** embed in OOXML | **Shipped** (`ooxml-font-embed.ts`, 2026-08-27) |
| Website ZIP woff2 embed | Shipped (pattern to reuse for NOTICE + bytes) |
| Hub minutes / election ballot DOCX | Brand Kit fonts + palette + logo (`minutes/export-docx.ts`, `elections/export-ballot.ts`) |
| Presets | Letters, welcome, letterhead, quick-event, lec-directory (placeholders); grievance/seniority **Word + Excel** |

### Build checklist

**B1 — Brand Kit parity (no binary fonts yet)**

- [x] Minutes DOCX ([`minutes/export-docx.ts`](../../src/lib/minutes/export-docx.ts)) and election ballot ([`elections/export-ballot.ts`](../../src/lib/elections/export-ballot.ts)) use Brand Kit fonts + palette + logo + OOXML binary embed (2026-09-05)
- [x] Legacy docxtemplater / `public/templates/office/` path unchanged — samples and tests only; Hub exports use `docx` builders above
- [x] XLSX header fonts map `canvasFontOfficeName` via shared `office-brand-styles` (2026-09-05)
- [ ] Surface logo-resolve failures when `includeLogo` is on (Document Generator already partial)

**B2 — Preset / coverage growth (as product asks)**

- [x] DOCX variants for grievance intake / seniority worksheet if stewards need Word, not only Excel
- [ ] LEC directory filled from Org Chart roster (explicitly dropped once — reopen only with product ticket; see [`session-knowledge-2026-08-23-org-chart-qol.md`](session-knowledge-2026-08-23-org-chart-qol.md))
- [ ] Additional letter/event templates only when a guide or Hub flow needs them

**B3 — OOXML binary font embed (stretch)**

- [x] Same TTF/OTF decision as Project A
- [x] Package faces into DOCX/PPTX with OFL `NOTICE` (mirror Website ZIP)
- [x] Unit/smoke asserts font files present in the ZIP/OOXML, not only face name strings
- [x] Lift “OOXML binary font embed” from parked non-goals when this tranche starts

### Shared with Project A

- Single OFL → embeddable-binary pipeline (woff2 today → TTF/OTF for PDF + Office)
- Keep `TOOL-004` dynamic imports for `docx` / jsPDF / heavy helpers
- No CDN font loading (ADR-014)

---

## Suggested sequence

1. **Font binary pipeline** (shared foundation) — decide format, size budget, NOTICE packaging — **done**
2. **Project A** — text PDF engine (floor sheets feel branded in selectable text) — **done** (layout refactor 2026-09-03)
3. **Project B1** — Hub DOCX onto Brand Kit builders — **done**; Hub OOXML embed + XLSX header fonts **done** (2026-09-05) — see [`session-knowledge-2026-09-05-pdf-office-engine-qol.md`](session-knowledge-2026-09-05-pdf-office-engine-qol.md)
4. **Project B3** — OOXML binary font embed — **done** (DOCX/PPTX presets 2026-08-27; Hub minutes/ballot 2026-09-05)
5. **Project B2** — new presets as guides/Hub demand them
6. **Residual QOL** — logo-resolve failures when `includeLogo` is on; any remaining error-only export buttons; optional XLSX body fonts

**Do not** merge canvas raster PDF + text PDF into one engine — share font/download helpers only (session knowledge 2026-09-05).

## Explicitly still deferred

- Growing the eight-face catalog
- Variable fonts
- Server-side PDF/DOCX generation
- Production Postgres flip (unrelated ops track)

## Verify when either project opens

```bash
npm run test:unit -- src/lib/export/text-pdf-layout.test.ts src/lib/export/office-export.test.ts src/lib/comms/canvas-fonts.test.ts
npx playwright test e2e/guide-pdf.export.smoke.spec.ts e2e/tools.export.smoke.spec.ts
```
