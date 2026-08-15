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

## Reverses prior non-gap

The 2026-08-14 note that “Flyer alone has font pickers; other tools stay typeScale-only” is **superseded**. Typeface is a Brand Kit canvas token applied across tools; Flyer keeps an override for print presets.

## Out of scope (follow-up)

- Embed webfonts in Website Template ZIP / Office `fontFace` (still Arial).
- Changing Hub / marketing chrome to Montserrat.

## Key paths

| Path | Role |
|------|------|
| `src/lib/comms/canvas-fonts.ts` | Catalog + migration |
| `src/app/canvas-fonts.ts` | `next/font/local` variables |
| `src/lib/utils/canvas-tokens.ts` | Token resolution |
| `src/components/brand/BrandKitCanvasPanel.tsx` | Headline/body pickers |
| `docs/DECISIONS.md` ADR-014 | Amended decision |
