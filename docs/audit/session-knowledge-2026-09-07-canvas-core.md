# Session knowledge — Canvas Core (2026-09-07)

## What shipped

Shared canvas geometry engine under `src/components/canvas-core/`:

- `CanvasWrapper` — design-px box, container-type by mode (`fixed`/`intrinsic`), upscale via `maxScale` (default 2)
- `LogoContainer` — parent-relative **%** width caps (works without a container ancestor; `cqw` alone fails if no container)
- `useCanvasExport`, `safe-zone`, contracts in `types.ts`
- `FitWidthFrame` re-exports `CanvasWrapper` with `maxScale={1}` for legacy call sites

Print density fix (CANVAS-005):

- `PRINT_PAGE_PX_PER_INCH` **100** → letter design **850×1100**
- `PRINT_PAGE_TARGET_WIDTH_PX` **1700** → export ratio **2** → **~200 PPI**
- Verified artifact: Flyer letter PNG **1700×2200**
- Attempted **2550** (~300 PPI / ratio 3) → Chromium `html-to-image` **heap OOM** (~4GB) on letter sheets in export smoke — do not raise without a non-browser path
- Legacy type reference `PRINT_PAGE_LEGACY_REFERENCE_PX = 306` so fonts/padding scale with denser canvases

### Migration register (Waves 0–4)

| Tool | Mode | Notes |
|------|------|--------|
| flyer-maker | fixed | Design px + A4; LogoContainer via layouts/header |
| board-notice | fixed | Same print math |
| solidarity-poster | fixed (print) / fluid (digital) | LogoContainer on stack/banner |
| org-chart | fixed | Legacy ref tokens |
| qr-board | fixed | Chrome budgets scale with design width |
| qr-card | fixed | LogoContainer; compact prefers mark |
| action-card | fixed | LogoContainer; compact prefers mark |
| pulse-poll | **intrinsic** | Intrinsic-mode proof |
| graphic-maker | fixed @ social design px | `exampleAspectDesignSize` |
| quote-card | fixed @ social design px | same |
| meeting-background | fixed @ HD design px | LogoContainer; UHD via pixelRatio |
| resizer | fixed @ catalog px | Gallery thumbs stay fluid |
| logo-builder | **intrinsic** | Plate wrap |
| board-banner (+ trim) | fluid strip | LogoContainer |

Formats: `src/lib/comms/canvas-aspects.ts` (A4, 1:1, 4:5, 16:9, …). Flyer Maker **and Board Notice** surface A4.

Guards: `measureCanvasProportions` / `expectCanvasProportions` on flyer layout-matrix (max logo % + cross-size spread ≤12). Export-root `paddingLeft` is often 0 (pad lives on inner layout) — do not assert `minPadPct` on the root alone.

What's new: `canvas-core-print-fit`.

## Gotchas for next agents

1. **`container-type: size` collapses content-driven canvases** — use `intrinsic` / `inline-size` when height is content-driven. `cqh` is unavailable in intrinsic mode.
2. Prefer **%** for logo slots when the parent may lack a container; nest `container-name: unionops-canvas` on the wrapper sheet.
3. Raising design width without scaling QR-board chrome budgets breaks plate ordering.
4. Canvas e2e is flaky in parallel — use `--workers=1`.
5. Verify DPI against **exported PNG dimensions**, not comments. `compareRasters` is preview↔export fidelity only (not gold baselines).
6. Never put `maxWidth: 100%` on `[data-export-root]` with fixed width/height (CANVAS-004). Inner QR plate wrappers may still use `maxWidth: 100%` to stay in-column — that is fine.
7. Do not chase ~300 PPI letter rasters in-browser until there is a server/worker export path; ~200 PPI is the practical ceiling.
8. Read [`canvas-core-audit-2026-09-06.md`](canvas-core-audit-2026-09-06.md) for measured pre-fix defects (81/58/44 logo %, 144 PPI, etc.).

## Docs / rules

- Spec: [`docs/modules/CANVAS_CORE.md`](../modules/CANVAS_CORE.md)
- Rule: [`.cursor/rules/canvas-core.mdc`](../../.cursor/rules/canvas-core.mdc)
- Roadmap item 0 marked shipped in `roadmap-next.mdc`
- Commit: `f30d97c` (engine + waves); follow-up flush this session
