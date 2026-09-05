# Session knowledge — PDF + Office engine QOL (2026-09-05)

After canvas type-fit (#76), this train lifted **Word / Excel / PowerPoint** (and Hub DOCX) toward Brand Kit fidelity canvas Comms already had. Companion canvas note: [`session-knowledge-2026-09-05-canvas-type-fit.md`](session-knowledge-2026-09-05-canvas-type-fit.md). Engine roadmap: [`future-pdf-and-docx-engines-2026-08.md`](future-pdf-and-docx-engines-2026-08.md). Cursor rule: [`.cursor/rules/export-engine-parity.mdc`](../../.cursor/rules/export-engine-parity.mdc).

## What shipped

| Surface | Change |
|---------|--------|
| Shared | [`office-brand-styles.ts`](../../src/lib/export/office-brand-styles.ts) — `resolveOfficeBrandFonts` / `withOfficeXlsxFont` |
| Hub minutes DOCX | `headlineFontId` / `bodyFontId` → `embedDocxBrandFonts` after `Packer.toBlob` |
| Hub election ballot DOCX | Same embed path |
| Document Generator XLSX | Header cells take Brand Kit face names; RSVP sheet EN/FR label packs |
| Hub boards | Ad-hoc `<a download>` helpers → shared `downloadBlob` (MIME / mobile) |
| What's new | `office-export-brand-fonts` |

## Three export lanes (do not collapse casually)

| Lane | Entry | Job |
|------|-------|-----|
| **A. Canvas raster PDF** | `pdf-export.ts` + capture/fidelity | Pixel-faithful print of Brand Kit canvases |
| **B. Text / guide PDF** | `text-pdf-layout.ts` + `pdf-layout/` | Selectable steward/officer worksheets, certificates, Hub reports |
| **C. Office** | `office-export.ts` + builders + `ooxml-font-embed.ts` | Editable DOCX / XLSX / PPTX + optional OFL binary embed |

Stewards need all three. Merging A+B into one writer would either lose selectable text or lose canvas fidelity. Prefer **shared foundations** (fonts, download, success UX) over a single megaclass.

## Lessons learnt

1. **Hub DOCX was name-only.** Document Generator already ran `embedDocxBrandFonts`; minutes/ballot only set Office face *names*. Offline Word fell back until this train.
2. **XLSX ignored Brand Kit type.** Palette fill was branded; header `font` objects omitted `name: canvasFontOfficeName(...)`.
3. **RSVP sheet was English-hardcoded.** Seniority/grievance XLSX already took label packs; RSVP did not — formula validation lists must use the same localized tokens as COUNTIF strings.
4. **Ad-hoc Hub downloads skip platform download QOL.** Local `URL.createObjectURL` helpers bypass MIME typing and mobile share behaviour in `downloadBlob`.
5. **Column-fit ≠ export integrity** (from #76) has an Office twin: **face name ≠ offline fidelity**. Assert embedded font *parts* in OOXML (`listEmbeddedOoxmlFonts`), not only style strings.
6. **Identifier drift in agent tools.** Prose search/read sometimes paraphrased export symbols. **List `export function` / `export type` from the file bytes before editing.**

## Python / shell checks that worked well

```bash
# Exact export symbols (no paraphrase)
python3 - <<'PY'
from pathlib import Path
import re
for p in [
  "src/lib/export/office-export.ts",
  "src/lib/export/ooxml-font-embed.ts",
  "src/lib/export/office-brand-styles.ts",
  "src/lib/minutes/export-docx.ts",
  "src/lib/elections/export-ballot.ts",
  "src/lib/comms/canvas-fonts.ts",
]:
  t = Path(p).read_text()
  print("###", p)
  print(re.findall(r"^export (?:async )?(?:function|type|const) \w+", t, re.M)[:20])
PY

# Prove a function name's bytes
python3 - <<'PY'
from pathlib import Path
data = Path("src/lib/comms/canvas-fonts.ts").read_bytes()
i = data.find(b"OfficeName")
print(data[i-24:i+40])
PY

# Who still uses ad-hoc download helpers
rg -n "function downloadBlob|createObjectURL" src/components/hub src/components/meetings

# Who embeds DOCX fonts vs name-only
rg -n "embedDocxBrandFonts|canvasFontOfficeName" src/lib/minutes src/lib/elections src/lib/export
```

**Vitest slice:**

```bash
npm run test:unit -- \
  src/lib/export/office-brand-styles.test.ts \
  src/lib/export/office-export.test.ts \
  src/lib/minutes/export-docx.test.ts \
  src/lib/elections/export-ballot.test.ts \
  src/lib/constants/updates.test.ts
```

## Parity rules (keep design + feature set aligned)

1. **Brand Kit faces** — `resolveOfficeBrandFonts` / `canvasFontOfficeName`; never hardcode Arial/Calibri for branded outputs.
2. **DOCX/PPTX offline** — after build, `embedDocxBrandFonts` / `embedPptxBrandFonts` with catalog ids (system faces no-op).
3. **XLSX headers** — `withOfficeXlsxFont(..., headFace)` on title/label/header rows.
4. **i18n** — EN/FR label packs for steward-facing sheet chrome; validation lists and COUNTIF literals share tokens.
5. **Downloads** — Hub/UI use `downloadBlob`, not one-off anchors.
6. **Success UX** — surface success via `useExportHandler` / layout props; error-only is incomplete.
7. **Tests** — blob size; embed → `listEmbeddedOoxmlFonts` length > 0 on non-system faces; XLSX → `font.name` + localized labels.
8. **PDF lanes stay specialized** — floor handouts → text PDF; canvas tools → raster `pdf-export`.

## Next steps (engines)

### Do next (high leverage)

1. **Logo-resolve failures** when `includeLogo` is on — user-visible remedy (future doc B1 residual).
2. **Export success** on any remaining guide/Hub PDF buttons that are still error-only.
3. **XLSX body fonts** — optional second pass using body face on data rows.
4. **PPTX paths** — confirm every Document Generator PPTX call passes font ids into `embedPptxBrandFonts`.

### Combine PDF engines? Verdict

**Do not merge raster + text PDF into one writer.** Keep shared:

- font binary pipeline + Brand Kit id resolution
- download / success helpers
- optional thin façade only if call sites stay confused — not required today

**Do deepen** `pdf-layout/` so Hub stragglers on one-off jsPDF move onto `text-pdf-layout` chrome (`GUIDE_PDF_LAYOUT.md`).

### Still deferred

- Server-side PDF/DOCX
- Growing the face catalog / variable fonts
- LEC directory filled from Org Chart (needs product ticket)
- Production Postgres flip (ops track)

## Go-live residuals (closed 2026-09-05)

| Residual | Fix |
|----------|-----|
| Logo soft-omit when include/configured | `requireBrandLogoBytes` / `resolveConfiguredBrandLogoBytes`; PPTX uses `resolveLogo()`; minutes/certificate/ballot surface `common.logoResolveFailed` / 422 |
| Node/Vitest public PNG fetch | `fetchBytes` tries `public/` via `fs` before HTTP (jsdom has `window` but no `/assets` HTTP) |
| PNG before canvas | Root-relative `.png` loads bytes before `rasterizeSrcToPng` (avoids jsdom Image timeouts) |
| Guide/Hub success UX | Reference sheet buttons, spreadsheet XLSX, steward pocket sheets, Hub reports show `exportSuccess` / `reportsExportSuccess` |

### Still deferred

- XLSX body-row Brand Kit fonts
- Merging raster + text PDF writers
- Ballot Brand Kit from client store (still `DEFAULT_BRAND_KIT` on the API)

