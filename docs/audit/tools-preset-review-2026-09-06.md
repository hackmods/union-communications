# Tools preset / default review (2026-09-06)

Goal: verify public tools still work and look correct for preselected/default inputs after site changes — including copy-visible cold-load guards and Board Banner trim ZIP.

## Inventory

23 tools under `src/app/[locale]/tools/`. Canvas export tools are the high-value surface for “preset looks broken.”

## Evidence (guard suite)

| Suite | Result |
|-------|--------|
| `tools.layout-matrix.smoke` | Pass — preset **copy visible** on Flyer/Graphic/Quote/Solidarity/Meeting; cold-load Flyer picket, Graphic spotlight, Meeting slogan, Quote bargaining role; half-letter walkabout meta; board-notice; board-banner trim+header; Pulse Poll soft-skip |
| `tools.qr-share.smoke` | Pass — QR Card/Board cold-load titles + plate geometry + existing URL/fit matrix |
| `tools.export.smoke` | Pass — Flyer/Graphic/Board Notice/Solidarity/Org Chart PNG/PDF + **Board Banner default trim ZIP = 3 PNGs** |
| `tools.export.fidelity` `@export` | Prior pass retained (30/31; Pulse Poll Hub-gated skip) |
| Unit: layout-class-matrix / flyer / public-copy | Unchanged contract |

Browser MCP unavailable — judgment via geometry helpers + copy-visible asserts (not “looks fine” alone).

## Guards added this pass

- Flyer: every `LAYOUT_CLASS_FLYER` headline+body on canvas; cold picket; half-letter walkabout keeps `Your department`
- Graphic: preset headlines + cold Member Spotlight
- Solidarity forever / Meeting bold+minimal+cold: Keep calm / SOLIDARITY / Together we win
- Quote: preset quote(+role) + cold bargaining role
- QR Card/Board cold: Get support / Membership application
- Board Banner: ZIP smoke → exactly three non-empty PNG sheets
- `ToolFormDetails`: React-owned summary toggle (controlled `<details>` no longer fights open/close)

## Confirmed regressions fixed (earlier + this)

| Issue | Fix | Commit / note |
|-------|-----|--------|
| Solidarity stack lead crushed beside wide lockup | Logo row → full-width lead; centered FitWidthFrame | `913992d` |
| Flyer walkabout split body+meta+QR crush | Fitted subtitle body; meta+QR footer; cold-load picket seed | `bdddf97` / `19426f2` |
| Graphic default Member Spotlight | Default spotlight + square + preset copy | `bdddf97` |
| QR / Quote empty or incomplete cold load | Seed first-preset copy | `bdddf97` |
| Copy invisible while geometry green | layout-matrix `expectExportCopy` | this pass |
| Board Banner trim ZIP unguarded | export.smoke 3-PNG ZIP | this pass |
| Flaky Layout section open in e2e | `ToolFormDetails` preventDefault toggle | this pass |

## Residual (accepted)

1. **Pulse Poll** — Hub-gated; soft-skip when canvas absent.
2. **Meeting Background** — export budgets OK; portrait preview can look tight only.
3. **Board Banner ZIP raster fidelity** — sheet count + size only (not `@export` compareRasters).
4. **Steward PDF tools** — load/axe only.
5. **Visual MCP gallery** — deferred when connector down.

## Verdict

Public Comms canvas presets/defaults: **copy-visible, cold-load seeded, layout/export smoke green**, including Board Banner trim ZIP. High-quality poster claim is gated on these asserts — not screenshot vibes alone.
