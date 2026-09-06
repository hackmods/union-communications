# Session knowledge — Flyer Maker walkabout / split fit (2026-09-06)

## Symptom

Walkabout handbill (`split` + half-letter + dense + QR) painted overlapping white type (lockup + local label + headline), clipped edges, and QR crowding meta into a thin band — looked broken next to board-notice.

## Root cause

1. Split bottom band stacked **body + meta + QR** (`widthPercent={100}` in a `sm:flex-row`) in ~120px on half-letter.
2. Wide CAAT lockup (`md` 220px) exceeded half-letter content width.
3. Top panel had no overflow cap — header fought fitted headline.
4. Cold load: Picket chip selected but canvas stayed `stack` / letter until re-click.
5. Layout-matrix never asserted flyer type↔meta overlap (board-notice only).

## Fix

- Split: body → `CanvasTypeBlock` `subtitle` with `fit`; meta-only footer; QR at default 28% under meta; no `sm:` inside export root
- Narrow sheets: `logoSize="sm"` + `max-w-full` header; BrandLogo `h-auto max-w-full`
- Cold load seeds `FLYER_PRESETS.picket` when no `?preset=`
- Graphic Maker default aligns spotlight layout with Member Spotlight copy
- Playwright: `flyer walkabout split has no type/meta overlap`

## Rule for agents

Flyer split must mirror board-notice: fitted title+body in the type slot; meta (and QR) in a separate footer band — never body+QR in one squeezed row with viewport `sm:` breakpoints on the capture root.
