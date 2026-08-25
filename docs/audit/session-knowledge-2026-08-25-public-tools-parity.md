# Session knowledge — 2026-08-25 (public tools parity Wave 3)

**Audience:** future agents + Ryan.  
**Companion:** [`public-tools-parity-audit-2026-08-25.md`](public-tools-parity-audit-2026-08-25.md), [`session-knowledge-2026-08-14-flyer-unified-tools.md`](session-knowledge-2026-08-14-flyer-unified-tools.md), [`.cursor/rules/tool-editor-ux.mdc`](../../.cursor/rules/tool-editor-ux.mdc).  
**Landed on:** `main` after Wave 1 (`bf2358e`) + Wave 2/P1 (`f888d8c`) + Wave 3 (this train).

---

## What Wave 3 shipped

| ID | Surface | Outcome |
|----|---------|---------|
| P2-CATALOG | `/tools` | lg+ **Start here** sidebar — first-week step links from `FIRST_WEEK_STEP_LINKS` + roadmap CTA; catalog grid becomes 2×2 @ lg / 4-col @ xl beside sticky aside |
| P2-DOCGEN-IA | `document-generator` | `BrandSetupPrompt` in header band; fields + structure collapsed via `ToolFormDetails`; **PageShell kept** (no TEL) |
| P2-ALT | `alt-text` | Graphic Maker trail link under `whenToUse`; reference column densified with `ToolFormDetails` (how / checklist / examples); **PageShell kept** |
| Docs | audit + register | As-built matrix in parity audit; `tool-editor-ux.mdc` register notes Wave 3 |

**Explicitly not shipped:** document-generator TEL migration, pulse choice options, Share Kit rebuild, unified layout engine.

---

## Four-width verification (375 / 768 / 1280 / 1536)

Structural review of Wave 3 surfaces (no page-level horizontal scroll patterns introduced):

| Surface | 375 | 768 | 1280 | 1536 |
|---------|-----|-----|------|------|
| `/tools` | Start-here stacks above catalog; tap targets ≥44px on step links | 2-col catalog | Catalog + sticky Start here sidebar | xl 4-col catalog + sidebar |
| `document-generator` | Collapsed branding/outputs/structure reduce scroll; BrandSetup in header | 2-col form + preview | Sticky preview column | Same |
| `alt-text` | Single column; collapses shorten reference stack | lg 2-col editor + reference | xl-equivalent at lg breakpoint | Same |

**All 17 tool routes:** Wave 1–2 already passed shell checklist; Wave 3 did not regress canvas tools. Re-touch register only if manual browser pass finds a failure.

---

## Hard lessons

1. **Layout exceptions stay exceptions** — alt-text and document-generator get shell parity (`whenToUse`, BrandSetup header, Related tools, collapses) without fake Edit/Preview tabs.
2. **Catalog lg+ needs composition, not padding** — reuse `FIRST_WEEK_STEP_*` from first-week roadmap; do not fork a second step list.
3. **BrandSetup belongs in the header band** on PageShell tools when the form is long — same rule as TEL `toolbar=`.
4. **Wave numbering:** Wave 1 = audit ranks 1–7; Wave 2 = ranks 8–11; Wave 3 = rank 12 + exception refactors.

---

## Verify

```bash
npm run lint
npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts
npm run test:smoke -- e2e/builders.smoke.spec.ts e2e/seo.smoke.spec.ts
```

Manual: `/en/tools` @ 1280 (sidebar visible); `/en/tools/alt-text` Graphic Maker link; `/en/tools/document-generator` collapsed fields + header BrandSetup.
