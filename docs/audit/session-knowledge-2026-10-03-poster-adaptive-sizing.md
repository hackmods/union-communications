# Session knowledge — Poster adaptive text and logo sizing (2026-10-03)

## Symptom

Solidarity Poster Maker (and Graphic Maker poster-style layouts) did not resize logos / supporting type when Brand Kit **Display** type scale or long Keep-Calm / FR headlines needed more vertical room. Headlines hit the fit floor while lockups stayed fixed; digital formats still used a fluid aspect box without design-px chrome.

## Root cause

1. `solidaritySupportChrome` ignored `typeScale` and always used `logoMaxHeightPx ≈ 14%` of width — logos never yielded to the type slot.
2. Digital formats had no `previewWidthPx` / `CanvasWrapper` fixed sheet — `LogoContainer` fell back to rem `max-h-20`; support chrome was skipped.
3. Split lead/closer used fixed `fontSize` without a fit loop.
4. Graphic Maker bottom bands used preferred `graphicLayoutChrome` px with no `CanvasTypeBlock` / fit into a bounded slot.

## Fix

- Digital Solidarity: fixed design sizes (1920×1080 / 1950×900 / 1080×1920) + `CanvasWrapper`; export ratio = `exportWidthPx / previewWidthPx`.
- `solidaritySupportChrome(width, { typeScale, headlineLineCount, designHeightPx })` — lead tracks type scale (capped); logo compresses under Display / multi-line; logo and QR capped by design height on landscape HD.
- Split side panel: `WalletCopyBlock fit` for lead + closer.
- Graphic Maker solidarity / spotlight / thanks / notice: `FittedSocialCopy` → `WalletCopyBlock` inside `max-h-[48%]` / flex-1 overflow slots; logos stay `maxHeightPx`.

## Do not regress

- Never rem / `max-h-20` on HD or print `[data-export-root]` sheets.
- Never put `maxHeight` + `overflow-hidden` on the logo **slot** while the image is `w-full` — cap height on the image.
- Do not apply portrait QR width shares (~12.5%) to landscape HD footers.
- Layout-matrix: digital 16:9 proportions + Display + long multi-line headline overlap guards.
