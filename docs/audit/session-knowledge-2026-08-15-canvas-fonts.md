# Session knowledge — Canvas brand fonts (2026-08-15)

## What shipped

Hybrid Comms typeface catalog for Brand Kit + export tools:

- **Self-hosted OFL** (via `next/font/local`, CSS vars on locale `<html>`): Montserrat, Source Sans 3, Barlow Condensed, Oswald, Source Serif 4, Roboto Slab under `public/fonts/` + [`LICENSES.md`](../../public/fonts/LICENSES.md).
- **System residual:** `systemSans`, `systemSerif`.
- **Defaults:** headline `montserrat`, body `sourceSans` (labour-digital / OPSEU-like, not Impact).
- Brand Kit: `headlineFontId` / `bodyFontId` on `BrandKitCanvas`; resolved in `resolveCanvasTokens`.
- Flyer: `inherit` | catalog id; legacy stacks migrate (`impact`→`oswald`, etc.).
- Capture awaits `document.fonts.ready`.
- ADR-014 amended: chrome stays system; canvas faces are local-only.

## Playwright coverage (added same day)

| Tag | File | What it proves |
|-----|------|----------------|
| `@smoke` | [`e2e/tools.fonts.smoke.spec.ts`](../../e2e/tools.fonts.smoke.spec.ts) | CSS vars on Brand Kit; Oswald picker; Flyer inherit + override; Graphic Barlow PNG brand/ink; Board Notice Source Serif PDF |
| `@export` | same file | Montserrat vs Oswald captures **differ**; Roboto Slab capture↔download; Meeting Background Oswald lines |

Helpers: [`e2e/helpers/canvas-fonts.ts`](../../e2e/helpers/canvas-fonts.ts) — `seedCanvasFonts`, `assertCanvasFontCssVars`, `exportRootHeadlineFontFamily`.

**Verify:**

```bash
npx playwright test e2e/tools.fonts.smoke.spec.ts --grep "@smoke"
npx playwright test e2e/tools.fonts.smoke.spec.ts --grep "@export"
# or full export suite
npm run test:export
```

On Windows PowerShell quote the grep: `--grep "@smoke"`. Prefer a live `npm run dev` + `PLAYWRIGHT_BASE_URL=http://localhost:3000` if Playwright’s managed webServer flakes after heavy PNG exports.

## Reverses prior non-gap

The 2026-08-14 note that “Flyer alone has font pickers; other tools stay typeScale-only” is **superseded**. Typeface is a Brand Kit canvas token applied across tools; Flyer keeps an override for print presets.

## Product / UX decisions locked this train

1. **1C hybrid** — curated OFL webfonts + thin system residual (not Google Fonts CDN).
2. **2A Brand Kit** — headline + body across canvas tools; Flyer may override.
3. Catalog stays **eight faces** — do not grow into an unbounded free-font browser without product ask.
4. Platform chrome remains ADR-014 system stack (no Montserrat on Hub shell).

## Next steps (ordered)

1. ~~**Website ZIP / Office embed (follow-up)**~~ — **shipped 2026-08-15** — Website ZIP bundles subset `@font-face` + woff2 + `NOTICE.txt`; Office DOCX/PPTX map catalog ids → face names (no OOXML binary embed).
2. ~~**Pulse Poll public fidelity**~~ — **shipped 2026-08-15** — Hub-auth `@export` Oswald case in `tools.fonts.smoke.spec.ts` (authoring stays Hub-gated; ADR-015 unchanged).
3. ~~**Quote Card / wallet spot-check in CI**~~ — **shipped 2026-08-15** — Oswald `@smoke` + `@export` rows for Quote Card + Action Card.
4. ~~**Ops Postgres flip (local verify)**~~ — **verified 2026-08-15** — `npm run ops:verify-durable` green (migrate/seed/durability/RLS). Production host flip remains an operator choice.
5. ~~**COPY-004**~~ — **shipped 2026-08-15** — FR caption template bodies in `messages`; see execution-backlog.
6. ~~**Variable-font consolidation (stretch)**~~ — **deferred** — `public/fonts/` ≈ 278 KB static Latin subsets; VF churn not justified until download size is a product issue.
7. **OOXML binary font embed (stretch)** — Office name-map is enough when faces are installed locally; embed only if product demands offline Word/PowerPoint without installed fonts.

Parked-followups plan: [`plan-2026-08-15-parked-followups.md`](plan-2026-08-15-parked-followups.md).

## Agent pitfalls

- PowerShell treats `@smoke` as a splat — always quote `--grep "@smoke"`.
- `assertRasterMatch(ref, cand, opts, label)` — four args; label is last.
- Seeding Brand Kit must use `addInitScript` **before** `goto`, keys `unionops-brand-kit` + `unionops-onboarding-complete`.
- next/font family names are hashed (`__Oswald_…`); assert with `/oswald|__/i` or `looksLikeWebfontFamily`, not the catalog id string alone.
- Do not load fonts from a CDN; do not put OPSEU names in font registry code.

## Key paths

| Path | Role |
|------|------|
| `src/lib/comms/canvas-fonts.ts` | Catalog + migration |
| `src/app/canvas-fonts.ts` | `next/font/local` variables |
| `src/lib/utils/canvas-tokens.ts` | Token resolution |
| `src/components/brand/BrandKitCanvasPanel.tsx` | Headline/body pickers |
| `e2e/tools.fonts.smoke.spec.ts` | Playwright rendering + export |
| `e2e/helpers/canvas-fonts.ts` | Seed / assert helpers |
| `docs/DECISIONS.md` ADR-014 | Amended decision |
