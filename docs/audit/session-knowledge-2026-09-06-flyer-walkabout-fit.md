# Session knowledge — Flyer Maker walkabout / split fit (2026-09-06)

## Symptom

Walkabout handbill showed: huge local label above a squashed “UNION WALKABOUT”, missing supporting details, Location clipped to “Your”, empty blue gap above meta/QR. Membership meeting stack cropped “All members welcome.”

## Root cause

1. Split header kept bilingual lockup **and** tracking-widest local label in the type column — half-letter height left ~nothing for `CanvasTypeBlock`, so fit crushed the title and clipped the subtitle.
2. Footer `MetaBlock` used `overflow: hidden` without wrap → “Your department” painted as “Your”.
3. Stack/meeting put body only in unfitted `MetaBlock` under a fitted title → body cropped by the fixed canvas.

## Fix

- Split: logo only in header (`showLocalLabel={false}`); local line in shrink-0 footer; type slot `min-h-[42%]` with title+body fitted; meta wraps (`overflowWrap`); smaller QR on half-letter
- Stack / band / photoHero: body → `CanvasTypeBlock` `subtitle` with `fit`; meta is date/time/location only
- Playwright: assert walkabout body + “Your department”; meeting “All members welcome”

## Rule for agents

On half-letter / dense flyers, never put BrandLogo lockup and the full local label in the same flex column as the fitted headline. Local belongs in the footer band with meta.
