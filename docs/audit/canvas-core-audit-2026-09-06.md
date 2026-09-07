# Canvas tools audit — 2026-09-06

Full-surface audit of every UnionOps visual canvas / graphic generator ahead of the
Canvas Core refactor. Engine spec and migration strategy live in
[`docs/modules/CANVAS_CORE.md`](../modules/CANVAS_CORE.md); the working rule is
[`.cursor/rules/canvas-core.mdc`](../../.cursor/rules/canvas-core.mdc).

**Status:** findings only. No application code was changed in this session.

## Method (why these numbers are trustworthy)

Every claim below was verified against disk or measured live — not inferred from search
results. Paths were confirmed with `git ls-files` per the phantom-path rule in
`.cursorrules`.

- **Live DOM measurement** on the running dev server at
  `http://localhost:3000/en/tools/flyer-maker/?preset=rally`, via CDP `Runtime.evaluate`,
  at 1920px and at an emulated 1024px viewport.
- **Exported artifact inspection** — real PNG dimensions read from
  `test-results/tool-export-smoke/*.png`.
- **Source reads** of `capture.ts`, `image-export.ts`, `pdf-export.ts`,
  `FitWidthFrame.tsx`, `MobilePreviewStage.tsx`, `flyer-layouts.tsx`, `BrandLogo.tsx`,
  `LocalLogoPlate.tsx`, `duotone-photo.ts`, `SafeLogoImage.tsx`, `print-page-formats.ts`.

## Inventory: what exists today

14 tools render a WYSIWYG design preview and capture `[data-export-root]`:
action-card, board-banner, board-notice, flyer-maker, graphic-maker, logo-builder,
meeting-background, org-chart, pulse-poll, qr-board, qr-card, quote-card, resizer,
solidarity-poster.

Nine other `/tools/*` routes are **not** canvas tools (alt-text, bylaw-builder,
complaint-vs-grievance, document-generator, pre-disciplinary-log, proposal-tracker,
rtw-accommodation, rules-of-order, website-template) — they use the Office or text-PDF
lanes and are out of scope.

Only **5 of 14** use a uniform scaling frame (`FitWidthFrame`): action-card, qr-card,
qr-board, org-chart, and solidarity-poster (print formats only). The other nine scale
ad-hoc via Tailwind aspect classes, fixed px, or nothing at all.

The **export pipeline is already unified**: no tool imports `html-to-image` or `jspdf`
directly. All raster paths run
`useExportHandler` → `exportNodeAsPng` / `nodeToPdf` / `exportNodeAsBlob` →
`withUnscaledAncestors` → `buildHtmlToImageOptions` → dynamic `html-to-image`.

---

## A. Tool & UI/UX defect inventory

| ID | Defect | Severity |
|---|---|---|
| CANVAS-001 | Logo sizing is not canvas-relative | High |
| CANVAS-002 | Margins / padding are not proportional | High |
| CANVAS-003 | Preview never scales up to fill its column | High |
| CANVAS-004 | Banned `maxWidth: 100%` on capture roots | High |
| CANVAS-005 | Print exports are ~144 PPI, not the documented ~300 DPI | High |
| CANVAS-006 | Fragmented, per-tool pixel-ratio policy | Medium |
| CANVAS-007 | `exportNodeAsSvg` bypasses all capture hardening | Medium |
| CANVAS-008 | Only 5 of 14 tools use a scaling frame | Medium |
| CANVAS-009 | Three competing type-scaling systems | Medium |
| CANVAS-010 | `CAPTURE_STYLE_PROPS` allowlist gaps | Medium (blocking for cq) |
| CANVAS-011 | QR source raster fixed at 160px | Medium |
| CANVAS-012 | Ad-hoc portrait preview caps compete with the fit system | Low |
| CANVAS-013 | Preview-fit guard only asserts width | Medium |
| CANVAS-014 | `aspectRatio` set alongside explicit width *and* height | Low |
| CANVAS-015 | Failed logo load silently substitutes the platform mark | Medium |

### CANVAS-001 — Logo sizing is not canvas-relative

**Measured** on Flyer Maker (rally preset), logo width as a share of canvas width:

- Half letter — canvas 198px, logo **160px = 81%**
- Letter — canvas 306px, logo **176px = 58%**
- Tabloid — canvas 396px, logo **176px = 44%**

At half letter the logo is clamped by `max-w-full` to the entire content box, so it
consumes 100% of the available inner width.

Root cause: [`BrandLogo`](../../src/components/brand/BrandLogo.tsx) resolves size from a
fixed pixel map, independent of canvas size:

```ts
const lockupSize = { sm: {width: 80, height: 32}, md: {...}, lg: {...} };
const wideLockupSize = { sm: {width: 176, height: 40}, ... };
```

`printPageScaledTokens` scales type and padding to the design width but **never touches
logo dimensions**. Flyer layouts hardcode `logoSize="sm"` on every layout variant.

This is the primary cause of the reported "inconsistent logo scaling across export canvas
sizes."

### CANVAS-002 — Margins / padding are not proportional

Measured inner padding as a share of canvas width: half letter **9.6%**, letter
**13.1%**, tabloid **12.6%**. Padding comes from `scaledTokens.paddingPx`, whose ratio is
clamped (`Math.min(1.12, ...)`), so it drifts instead of holding a constant proportion.

### CANVAS-003 — Preview never scales up to fill its column

At a 1920px viewport the flyer export root measures **306x396** inside a **732px**
preview column (42% fill). At 1024px it is 306px in a 487px column (63% fill).

[`FitWidthFrame`](../../src/components/tools/FitWidthFrame.tsx) computes
`Math.min(1, w / designWidth)` — it only ever scales **down**. Migrating a tool to
`FitWidthFrame` therefore fixes aspect safety but does **not** fix the pinned-small
preview. An opt-in `maxScale` is required.

Note: the reported "cut off" screenshot is not clipping. The sheet is rendering at its
true 306px design size with a large empty column beside it.

### CANVAS-004 — Banned `maxWidth: 100%` on capture roots

[`flyer-layouts.tsx`](../../src/components/tools/flyer-layouts.tsx) and
[`board-notice-layouts.tsx`](../../src/components/tools/board-notice-layouts.tsx) set:

```ts
const canvasBoxStyle: CSSProperties = {
  width: designWidthPx, height: designHeightPx, maxWidth: "100%", flexShrink: 0,
};
```

`.cursor/rules/solidarity-posters.mdc` explicitly forbids this: *"never `maxWidth: 100%`
on the capture root (aspect + type would desync)."* When the column is narrower than the
design width, width shrinks while height stays fixed, so the paper aspect and the type
scale decouple.

On desktop this is currently **latent** — design widths (198–396px) are always smaller
than any `lg` column — but it bites on narrow columns and is a live correctness trap.

### CANVAS-005 — Print exports are ~144 PPI, not ~300 DPI

`printPageExportPixelRatio` documents *"Target ~300dpi letter width"* with
`targetWidthPx = 2550`, but clamps the result:

```ts
return Math.max(2, Math.min(4, targetWidthPx / format.previewWidthPx));
```

For letter: `2550 / 306 = 8.33`, clamped to **4**. Export width is therefore
`306 x 4 = 1224px` across 8.5in = **144 PPI**.

**Confirmed against real exported artifacts** in `test-results/tool-export-smoke/`:

- `flyer-local-243.png` = **1224x1584**
- `org-chart-org-chart-letter-local-243.png` = **1224x1584**
- `solidarity-solidarity-poster-letter-local-243.png` = **1224x1584**
- `graphic-graphic-local-243.png` = 1296x1296

Every letter print export is less than half the intended print density. The clamp cannot
simply be raised — see BLIND-004 and CANVAS-011 — the design width must grow with it.

### CANVAS-006 — Fragmented pixel-ratio policy

- `buildHtmlToImageOptions` default: **2**
- `exportNodeAsBlob` default: **1** (inconsistent with `exportNodeAsPng`; latent today
  because both call sites pass explicit values, but a footgun for new ZIP exports)
- Print family: `printPageExportPixelRatio`, clamped 2–4
- QR family: ~200 DPI math, clamped 2–4
- Wallpapers: `targetPx / node.offsetWidth`, fallback 2
- logo-builder: hardcoded **3**
- graphic-maker, quote-card, board-banner: hardcoded **2**
- pulse-poll: implicit default 2

### CANVAS-007 — `exportNodeAsSvg` bypasses capture hardening

```ts
const { toSvg } = await import("html-to-image");
const dataUrl = await toSvg(node, { cacheBust: true });
```

No `withUnscaledAncestors`, no `inlineComputedStylesForCapture`, no explicit dimensions.
A logo-builder SVG export can therefore bake a preview scale transform and unresolved
oklch colours. Used by logo-builder only.

### CANVAS-009 — Three competing type-scaling systems

1. `printPageScaledTokens(tokens, designWidth, referenceWidth)` ratio scaling
2. `typeScaleFactor(tokens)` Brand Kit display/compact/dense multiplier
3. JS measurement fit loops (`CanvasTypeBlock`, `CanvasFitStackedHeadline`)

plus per-tool hand-tuned px (`metaSize = subtitleFontSizePx + 4`). Flyer applies
`resolveFlyerTokens` **and** `printPageScaledTokens`, i.e. density is applied twice.

### CANVAS-010 — `CAPTURE_STYLE_PROPS` allowlist gaps

`inlineComputedStylesForCapture` inlines a fixed allowlist of computed values onto the
capture clone. It covers `fontSize`, `padding*`, `gap`, `width/height`, `min/max`,
`inset`, `borderRadius`, `transform`. It does **not** cover `borderTopWidth` (or the
other three sides), `borderStyle`, `aspectRatio`, `flexBasis`, `flexGrow`, `flexShrink`,
`backgroundSize`, `backgroundPosition`, or `boxShadow`.

This is **blocking for the container-query migration**: any `cqw` used in an uncovered
property resolves in the live tree but is not flattened onto the clone.

### CANVAS-013 — Preview-fit guard only asserts width

`expectPreviewFitsColumn` in [`e2e/helpers/canvas-layout.ts`](../../e2e/helpers/canvas-layout.ts)
asserts only `visualWidth <= columnWidth + 2`. Because `maxWidth: 100%` guarantees the
width fits, **the flyer defect passes CI today**. There is no height, aspect, or
proportion assertion.

### CANVAS-015 — Failed logo load silently substitutes the platform mark

[`SafeLogoImage`](../../src/components/brand/SafeLogoImage.tsx) swaps to the UnionOps
logo `onError`. A local whose custom logo fails to load will export a poster carrying the
**platform** brand instead of their own, with no warning. Correct as crash-protection,
wrong as silent brand substitution on an export.

---

## B. External & off-site edge cases

| ID | Trap |
|---|---|
| EDGE-001 | Canvas taint in duotone compositing (no `crossOrigin`), silent fallback |
| EDGE-002 | CDN-served `/assets` would break logo inlining in exports |
| EDGE-003 | Webfont wait times out silently after 5s |
| EDGE-004 | `document.fonts.ready` resolves early for not-yet-requested faces |
| EDGE-005 | Device pixel ratio is currently immune — do not regress it |
| EDGE-006 | CSP blocks `fetch(data:)`; iOS share-sheet save path |
| EDGE-007 | localStorage quota and private-browsing throws |
| EDGE-008 | `cacheBust: true` re-requests every image |
| EDGE-009 | Object-URL lifetime |
| EDGE-010 | No print bleed or crop marks |
| EDGE-011 | A4 vs Letter physical mismatch at the printer |

### EDGE-001 — Canvas taint in duotone compositing

[`duotone-photo.ts`](../../src/lib/utils/duotone-photo.ts) loads the photo with a plain
`new Image()` — **no `img.crossOrigin = "anonymous"`** — draws it to a canvas, then calls
`canvas.toDataURL()`. If `photoUrl` is ever a cross-origin `http(s)` URL rather than a
`data:`/`blob:` URL, the canvas is tainted and `toDataURL` throws `SecurityError`. The
`catch` returns the original `photoUrl`, so **the export silently loses the duotone
treatment with no user-visible error**.

Safe today only because photos come from local file uploads. Any future "paste an image
URL" or remote-asset feature trips this immediately.

### EDGE-002 — CDN-served `/assets` would break logo inlining

Logos render through plain `<img src="/assets/...">` with no `crossOrigin`. html-to-image
must read those bytes to inline them. `.cursor/rules/seo.mdc` already contemplates
long-cache static `/assets/*` trees; if a host ever serves that tree from a different
origin without permissive CORS, **every export loses its logo** while the on-screen
preview still looks correct.

### EDGE-003 / EDGE-004 — Webfont race conditions

`awaitDocumentFontsReady` races `document.fonts.ready` against a **5s timeout**:

```ts
await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, timeoutMs))]);
```

On timeout, capture proceeds with fallback metrics and no error surfaces — a silent
fidelity failure. Separately, `document.fonts.ready` resolves immediately when no load is
*pending*; `next/font/local` faces load lazily on first use, so a "switch headline font,
immediately export" sequence can race. The double `requestAnimationFrame` in
`withUnscaledAncestors` mitigates but does not guarantee this.

Existing coverage: `e2e/tools.fonts.smoke.spec.ts` plus `seedCanvasFonts`.

### EDGE-005 — Device pixel ratio is currently correct

Exports are deterministic across displays because every tool passes an explicit
`pixelRatio` and `buildHtmlToImageOptions` sizes from `node.offsetWidth`/`offsetHeight`
(layout px, unaffected by DPR or ancestor transforms). **Do not regress this** by
switching to `getBoundingClientRect()` (transform-scaled) or by reading
`window.devicePixelRatio`.

### EDGE-006 — CSP and mobile save paths

`vercel.json` CSP `connect-src 'self'` blocks `fetch(data:)`, which is why
`dataUrlToBlob` exists. `saveBlob` handles Web Share, iOS inline display, and
`file-saver`. Any new export helper must reuse `saveBlob`, never `createObjectURL` ad hoc
(also required by `.cursor/rules/export-engine-parity.mdc`).

### EDGE-010 — No print bleed or crop marks

PDFs are generated at exact trim size (`format: [widthInches, heightInches]`, image at
`(0,0)` full page). There is no bleed allowance and no crop marks, so any full-bleed
colour field will show a white hairline if a commercial printer trims off-register. The
brief asks for explicit bleed guidelines — this is currently unimplemented, not merely
inconsistent.

---

## C. Recommended QoL enhancements

| ID | Enhancement | Notes |
|---|---|---|
| QOL-001 | Safe-zone overlay on every canvas tool | `CanvasSafeZoneOverlay` exists but only meeting-background, solidarity-poster, resizer use it |
| QOL-002 | Auto-fit text on every tool | `CanvasTypeBlock fit` / `CanvasFitStackedHeadline` exist; adoption is partial |
| QOL-003 | Aspect-ratio lock + consistent format switcher | Formats are per-tool registries with divergent labels |
| QOL-004 | Layout reset + undo/redo parity | `useUndoRedo` exists; Reset is not on every tool |
| QOL-005 | Zoom / fit-to-column / "actual size" control | Users cannot currently enlarge a 306px preview |
| QOL-006 | Show export dimensions before download | e.g. "Exports 2550x3300 at 300 DPI" — would have surfaced CANVAS-005 to users |
| QOL-007 | Overflow warning when the fit loop hits its floor | `CANVAS_TYPE_FIT_MIN_SCALE` is reached silently today |
| QOL-008 | Per-format logo presets and max-size guidance | Directly addresses CANVAS-001 |
| QOL-009 | Bleed / crop-mark toggle for print formats | See EDGE-010 |
| QOL-010 | Pre-export preflight (contrast, safe zone, overflow, missing logo) | Combines `ContrastChecker` + safe zone + CANVAS-015 |
| QOL-011 | Remember last-used format per tool | Via `DataAdapter`, not raw localStorage |
| QOL-012 | Consistent preview chrome | Shadow must stay outside the capture root (oklch washout) |

---

## D. Blind spots (not raised in the brief, will bite during or after the refactor)

### BLIND-001 — `container-type: size` applies size containment in **both** axes

This is the single biggest technical trap in the planned engine. An element with
`container-type: size` **cannot be sized by its content**. Tools with content-driven
height will collapse:

- **pulse-poll** — `relative mx-auto flex w-full max-w-md flex-col`, no fixed height
- **board-banner** — design preview strips sized by inline `aspectRatio`
- **logo-builder** rectangle plate — `h-44 w-[28rem]`, content-influenced

Mitigation: fixed-size canvases use `container-type: size` (enabling `cqh`);
content-driven canvases must use `container-type: inline-size`, which makes **`cqh`
unavailable** there. The engine contract must express this, not assume one mode.

### BLIND-002 — `cqw` resolves against the *nearest* container ancestor

Any nested container silently re-bases every unit. `LogoContainer` inside a
`CanvasWrapper` is fine only if `LogoContainer` does **not** itself declare a
`container-type`. Use an explicit `container-name` on the canvas root and reference it,
so nesting a future sub-container cannot hijack the scale.

Note `LocalLogoPlate` already sets `containerType: "size"` and is rendered *inside* the
resizer's export frame — an existing nested-container case to check during migration.

### BLIND-003 — Container queries buy authoring consistency, not export fidelity

Because `inlineComputedStylesForCapture` flattens computed values to px on the clone, a
`cqw` layout and a design-px layout produce **identical rasters**. The win is that one
proportional rule replaces `printPageScaledTokens` + `typeScaleFactor` + hand px — which
is exactly what fixes CANVAS-001/002. Do not expect image-quality gains from `cqw`; the
actual quality lever is the DPI clamp (CANVAS-005).

This is worth stating plainly so a future session does not "discover" it and conclude the
migration was pointless.

### BLIND-004 — Upscaling the preview magnifies raster assets

Adding `maxScale > 1` (needed for CANVAS-003) enlarges a 306px sheet toward ~700px.
Raster logos (`logo-primary.png`) and the 160px QR PNG will look soft **in preview while
the export is fine** — the inverse of the usual complaint, and a likely bug report.
Raising design widths to fix CANVAS-005 is the cleaner path and fixes both.

### BLIND-005 — Fidelity baselines will churn

`compareRasters` uses a per-channel threshold of 24 with a 4% max-diff. Sub-pixel
rounding differences from `cqw` will move pixels on every migrated tool; expect
`@export` churn and resist the temptation to loosen the threshold globally.

### BLIND-006 — The e2e suite is flaky in parallel on this machine

Terminal history for this repo shows the layout-matrix, QR-share, and export smoke suites
repeatedly failing in parallel and **passing with `--workers=1`**. A 14-tool migration
gated on those suites means slow serial feedback. Budget for it; do not misread a
parallel flake as a migration regression.

### BLIND-007 — Do not reintroduce Tailwind colour utilities in capture roots

Arbitrary cq values (`text-[clamp(0.75rem,4cqw,1.5rem)]`) are safe because they compute
to px. Tailwind **colour/opacity** utilities inside a capture root remain banned
(oklch washout) per `comms-module.mdc`. A large class-based rewrite is exactly where that
rule gets broken by accident.

### BLIND-008 — `printPageScaledTokens` has four consumers

flyer-layouts, board-notice-layouts, org-chart, solidarity-poster — plus a
`boardNoticeScaledTokens` deprecated alias and unit tests. Removing it outright breaks
four tools at once. Keep a shim through the migration.

### BLIND-009 — Proportions must not override the multi-union Brand Kit seam

`resolveCanvasTokens(brandKit)` is how per-union density, type scale, alignment bias, and
typefaces reach the canvas. Hardcoding proportions in the engine would flatten
per-union/per-collection identity — a multi-union regression, not just a style one.

### BLIND-010 — One logo aspect lock cannot fit both lockups and marks

Wide CAAT lockups are 176x40 (~4.4:1); marks are 1:1; standard lockups 80x32 (2.5:1).
A single `aspectRatio` in `AssetBounds` will distort or letterbox one of them.
`AssetBounds` must be resolved per variant off `resolveBrandLogoPresentation`.

### BLIND-011 — Accessibility floor for baked canvas text

Canvas text is rasterized, so axe cannot audit it. Aggressive auto-fit can shrink copy
below legibility (`CANVAS_TYPE_FIT_MIN_SCALE` with a 10–12px floor). Add a minimum
effective font-size assertion to the layout matrix, and keep contrast checks on.

### BLIND-012 — French copy will fit worse than English

FR strings run roughly 15–25% longer. Auto-fit will shrink FR harder, so the same poster
exports with visibly smaller type in French. The layout matrix currently exercises `/en`
routes; add FR rows for at least one text-heavy tool per layout class.

### BLIND-013 — Shipping obligations attach to the new formats

New sizes are steward-visible, so they require a `/updates` What's new note
(`.cursor/rules/whats-new.mdc`) and EN/FR labels whose **claims** match
(`.cursor/rules/i18n-public-copy.mdc`), not just key parity.

### BLIND-014 — Existing hydration mismatch on tool pages

The dev server logged a hydration mismatch originating in
`src/components/providers/BrandChromeInitScript.tsx` while tool pages were loading during
this session. Adding more client-side measurement (ResizeObserver-driven scale) on top of
an existing hydration warning will make first-paint jump harder to diagnose. Investigate
before layering on.

### BLIND-015 — PDF colour path is JPEG, not lossless or CMYK

`nodeToPdf` re-encodes through `pngDataUrlToJpegDataUrl(dataUrl, 0.92)`. Flat brand
fields can band, and there is no CMYK conversion. Acceptable for office printers; a real
trap if a local sends a PDF to a commercial printer.

### BLIND-016 — There is no visual-regression baseline

`compareRasters` compares **preview against export**, not against an approved design. A
refactor can shift every canvas consistently and still pass every check. Capture
before/after reference PNGs per layout class prior to Wave 1.

---

## E. Evidence appendix

Flyer Maker (rally preset), measured live:

| Paper size | Canvas | Logo | Logo % | Padding | Padding % | Title |
|---|---|---|---|---|---|---|
| Half letter | 198x306 | 160px | 81% | 19px | 9.6% | 14px |
| Letter | 306x396 | 176px | 58% | 40px | 13.1% | 26px |
| Tabloid | 396x612 | 176px | 44% | 50px | 12.6% | 42px |

Preview fill: 306px sheet in a **732px** column at 1920px viewport (42%); in a **487px**
column at 1024px viewport (63%).

Exported artifacts: letter print tools all emit **1224x1584** (144 PPI at 8.5x11in).

Container-query precedent already shipping inside an export root:
[`LocalLogoPlate.tsx`](../../src/components/brand/LocalLogoPlate.tsx) `size="fluid"` uses
`containerType: "size"`, `text-[clamp(0.75rem,4cqw,1.5rem)]`, percentage padding/gaps and
`h-[clamp(1.5rem,28%,3rem)]` logo heights — proof the approach survives capture.
