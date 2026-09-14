# Session knowledge — Canvas digital type family pass (2026-09-13)

**Trigger:** After Meeting Background and Solidarity Poster, the same rem-on-design-px defects still lived on other Canvas Core sheets.

## Same root cause

Canvas Core authors at fixed design px (social 1080 / 1920, print letter 850). Preview `transform`-scales. Type and logos left in browser `rem` / Brand Kit letter-ish tokens (~28–36 title) stay postage-stamp. Print `expectMetaSupport` (≤23px on `[data-canvas-meta]`) is a **supporting** cap — never a headline budget.

## Fixed this pass

| Surface | Change |
|---|---|
| Graphic Maker + Quote Card | `graphicLayoutChrome(tokens, exportMode, designWidthPx)` scales title/body from 1080/1920; meta stays 14–22 |
| Quote marks + author | Design-px, not `text-[5.5rem]` / meta-sized attribution |
| `LocalFooter` + lockups | `metaPx` + `LogoContainer maxHeightPx`; local label `nowrap` |
| Flyer / Board Notice / Org Chart | `printBrandHeaderChrome` on `CanvasBrandHeader` (no rem `0.875rem` / `max-h-20`) |

## Audited, no change

- **QR Card / Action Card / QR Board** — already width-scaled px
- **Pulse Poll** — small wallet canvas + wallet type
- **Board Banner** — fluid `vmin` strip (different class)
- **Meeting Background / Solidarity Poster** — fixed earlier today

## Do not regress

- Pass `designWidthPx` into `graphicLayoutChrome` on every social sheet. Omitting it keeps the legacy letter-ish numbers for unit tests only.
- Brand Kit type scale is a multiplier, not required for punchy defaults.
- Do not put `LogoContainer` at 100% of a flex row that also holds the local label.
- Joint Action on Graphic Maker is still a social layout — size it from design px, not Tailwind `text-lg`.
