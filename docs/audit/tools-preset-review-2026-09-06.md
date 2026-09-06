# Tools preset / default review (2026-09-06)

Goal: verify public tools still work and look correct for preselected/default inputs after site changes.

## Inventory

23 tools under `src/app/[locale]/tools/` (see agent inventory in goal thread). Canvas export tools are the high-value surface for “preset looks broken.”

## Evidence run this session

| Suite | Result |
|-------|--------|
| `tools.layout-matrix.smoke` (flyer, solidarity, graphic, quote, board-notice, meeting, board-banner, QR share companion) | Pass (pulse-poll Hub case timed out once — known gate flake) |
| `tools.qr-share.smoke` | 8/8 pass |
| `tools.export.smoke` | Flyer PDF, Graphic PNG, Board Notice PDF, Org Chart PNG pass; Flyer/Solidarity PNG pass on serial retry (parallel timeouts) |
| `builders.smoke` + `steward-tools.smoke` (filtered) | 59 pass — headings, axe, mobile Edit/Preview |
| Unit: updates, public-copy-style, flyer-maker, layout-class-matrix | Pass |

Browser MCP unavailable this session — visual judgment relied on layout geometry helpers + prior user screenshots.

## Confirmed regressions fixed (shipped)

| Issue | Fix | Commit |
|-------|-----|--------|
| Solidarity stack lead crushed beside wide lockup | Logo row → full-width lead; centered FitWidthFrame | `913992d` |
| Flyer walkabout split body+meta+QR crush | Fitted subtitle body; meta+QR footer; cold-load picket seed | `bdddf97` |
| Graphic default Member Spotlight + solidarity layout | Default spotlight + square + preset copy | `bdddf97` |
| QR Card / QR Board empty canvas until hydrate | Seed first-preset copy/slots on initial state | `bdddf97` |
| Quote Card missing bargaining role on cold load | Role string aligned with bargaining preset | `bdddf97` |

## Residual / not proven

1. **Pulse Poll** — layout-matrix Hub-reachable case can timeout; needs demo officer login + Hub up.
2. **Export fidelity** (`npm run test:export`) — not re-run this session.
3. **Board Banner default trim kit** — matrix/fidelity use header mode only.
4. **Meeting Background** — lower-third/masthead still put lockup beside type (face-safe by design); no lead-width crush guard.
5. **Steward PDF tools** — load/smoke only; no canvas geometry.
6. **Visual MCP pass** — deferred (connector broken this session).

## Verdict

Canvas preset tools that failed stewards visually (Solidarity lockup crush, Flyer walkabout) are fixed and guarded. Broader matrix/export/builders evidence shows presets still compose and export. Full “every tool looks correct” is **not** closed until residuals above are cleared (especially fidelity + visual spot-check).
