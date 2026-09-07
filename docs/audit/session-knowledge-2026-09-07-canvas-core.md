# Session knowledge — Canvas Core (2026-09-07)

## What shipped

Shared canvas geometry engine under `src/components/canvas-core/`:

- `CanvasWrapper` — design-px box, container-type by mode (`fixed`/`intrinsic`), upscale via `maxScale`
- `LogoContainer` — parent-relative % width caps (works without a container ancestor)
- `useCanvasExport`, `safe-zone`, contracts in `types.ts`
- `FitWidthFrame` re-exports `CanvasWrapper` with `maxScale={1}`

Print density fix (CANVAS-005):

- `PRINT_PAGE_PX_PER_INCH` **100** (letter design **850px**)
- `PRINT_PAGE_TARGET_WIDTH_PX` **1700** → export ratio **2** → **~200 PPI** (2550/~300 PPI OOMs Chromium html-to-image on letter)
- Legacy type reference `PRINT_PAGE_LEGACY_REFERENCE_PX = 306` so fonts scale with denser canvases

Migrations: flyer, board-notice, solidarity, org-chart, qr-board, qr-card, action-card, pulse-poll (intrinsic), graphic, quote, meeting-background, resizer, logo-builder, board-banner (+ trim).

Formats: `src/lib/comms/canvas-aspects.ts` includes A4, 1:1, 4:5, 16:9, etc. Flyer UI surfaces A4.

Guards: `measureCanvasProportions` / `expectCanvasProportions` wired into flyer layout-matrix (max logo % + cross-size spread).

## Gotchas for next agents

1. Do **not** put `container-type: size` on content-driven canvases without height — use `intrinsic` / `inline-size`.
2. Prefer **%** for logo slots when the parent may lack a container ancestor; `cqw` alone fails silently.
3. Raising design width without scaling chrome budgets breaks QR-board plate ordering — scale chrome with design.
4. Canvas e2e is flaky in parallel — use `--workers=1`.
5. Verify DPI against **exported PNG dimensions**, not code comments (`compareRasters` is preview↔export fidelity only).
6. Read [`docs/audit/canvas-core-audit-2026-09-06.md`](canvas-core-audit-2026-09-06.md) before changing logo/capture math.

## Docs / rules

- Spec: [`docs/modules/CANVAS_CORE.md`](../modules/CANVAS_CORE.md)
- Rule: [`.cursor/rules/canvas-core.mdc`](../../.cursor/rules/canvas-core.mdc)
- Roadmap item 0 marked shipped in `roadmap-next.mdc`
