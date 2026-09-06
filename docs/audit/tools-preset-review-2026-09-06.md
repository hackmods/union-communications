# Tools preset / default review (2026-09-06)

Goal: verify public tools still work and look correct for preselected/default inputs after site changes.

## Inventory

23 tools under `src/app/[locale]/tools/`. Canvas export tools are the high-value surface for “preset looks broken.”

## Evidence

| Suite | Result |
|-------|--------|
| `tools.layout-matrix.smoke` | Pass for flyer, solidarity, graphic, quote, board-notice, meeting, board-banner header + **default trim**, QR companion |
| `tools.qr-share.smoke` | 8/8 pass |
| `tools.export.smoke` | Flyer/Graphic/Board Notice/Solidarity/Org Chart PNG/PDF pass |
| `tools.export.fidelity` `@export` | **30/31 pass** — all public canvas PNG/PDF/ZIP/Office/SVG/font captures; Pulse Poll Hub case skips when tool gated |
| `builders.smoke` + `steward-tools.smoke` | 59 pass — headings, axe, mobile Edit/Preview |
| Unit: updates, public-copy-style, flyer-maker, layout-class-matrix | Pass |

Browser MCP unavailable — visual judgment via layout geometry helpers + steward screenshots that triggered fixes.

## Confirmed regressions fixed (shipped)

| Issue | Fix | Commit |
|-------|-----|--------|
| Solidarity stack lead crushed beside wide lockup | Logo row → full-width lead; centered FitWidthFrame | `913992d` |
| Flyer walkabout split body+meta+QR crush | Fitted subtitle body; meta+QR footer; cold-load picket seed | `bdddf97` |
| Graphic default Member Spotlight + solidarity layout | Default spotlight + square + preset copy | `bdddf97` |
| QR Card / QR Board empty canvas until hydrate | Seed first-preset copy/slots on initial state | `bdddf97` |
| Quote Card missing bargaining role on cold load | Role string aligned with bargaining preset | `bdddf97` |
| Pulse Poll Hub e2e hard-fail when soft-launched | Skip when heading/canvas absent (layout-matrix + fonts @export) | (this pass) |
| Board Banner default trim unguarded | Layout-matrix cold-load Frame trim + ZIP + column fit | (this pass) |

## Residual (accepted / out of canvas-preset scope)

1. **Pulse Poll** — Hub-gated; public hosts skip. Verify on Hub-public demos with demo officer.
2. **Meeting Background** — side-by-side lockup+type is safe at export size (not Solidarity crush); portrait preview can look tight only.
3. **Board Banner ZIP fidelity** — off-screen multi-sheet capture not in `@export` (header single-sheet is).
4. **Steward PDF tools** — load/smoke + axe only (no canvas geometry by design).
5. **Visual MCP gallery** — deferred when connector down; automated geometry + fidelity substitute for preset correctness.

## Verdict

Public Comms canvas tools with presets/defaults: **working and export-faithful** after the fixes above. Inventory, layout/export evidence, code-reviewed failure modes, and confirmed regressions are closed. Remaining items are Hub-gated, non-canvas, or preview-only polish — not unfixed preset breakage.
