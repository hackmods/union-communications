# Session knowledge — Wave B fit-gap (poster / canvas QOL) — 2026-09-30

## Baseline verdicts

| ID | Verdict | Evidence |
|----|---------|----------|
| **B1–B2** Poster shared primitives + chips + accent | **NARROW → mostly SKIP** | Live tools already use `Select`, `Checkbox`, `ToolColourSection`, treatments, and shared editor chrome. Plan `plan-2026-09-13-poster-tools-qol.md` is largely obsolete vs Canvas Core / fluid / treatments. Residual: board-banner `showByline` was still a raw `<input type="checkbox">` → migrated to shared `Checkbox`. |
| **B3** Meeting Background P1–P4 | **SKIP** | Shared `Checkbox`/`ToolColourSection` + accent + `CanvasSafeZoneOverlay` / `edgeClearance` already present on `meeting-background/page.tsx`. |
| **B4** Canvas visual residuals | **SKIP / demand-driven** | `canvas-visual-redesign-plan-2026-09-07.md` residuals (split packing, `wideLockup`, Look×layout gallery) remain optional art-direction debt — not blocking tool standards alignment. File separately if a design pass asks. |
| **B5** OL module viewer / Hub board density | **SKIP** | Index/dashboard already fluid; module-viewer xl densify remains optional growth backlog. |
| **B6** CAAT-S Balanced steward sign-off | **HUMAN** | Automation + QOL treatment already shipped; steward eye-check still in lighter-comms followthrough. |
| **B7** COPY-006 | **SKIP / demand-driven** | Partial deepen already shipped Aug 27; full channel-tier playbook stays workshop/feedback driven. |
| **B8** Per-union caption packs | **SKIP** | Generic FR captions shipped; packs need content owners + licensing — no invented national packs. |

## UI/UX

- Board Banner byline toggle now matches accent-coloured shared Checkbox focus ring used by Meeting Background / QR tools.
- No new preset-chip migration this pass — flyer-maker chip pattern already used where tools were migrated earlier.

## Lessons

1. Alignment Gate prevented a large redundant poster-family rewrite.
2. One leftover raw control after a family migration is a common residual — grep `type="checkbox"` / `<select` under `tools/` after each pass.

## Residuals

- Optional: expose accent on QR Board `ToolColourSection` if product wants a third brand colour (canvas currently maps accent via secondary in places).
- B4 art residuals + B6 human sign-off + B7 content depth remain outside this engineering close.

## Files

- `src/app/[locale]/tools/board-banner/page.tsx`
