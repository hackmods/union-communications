# Comms Visual System

Shared **canvas chrome** for public export tools: Brand Kit–owned tokens + primitives, with per-tool layout IDs unchanged (hybrid model).

## Audit findings → tokens

| Finding | Response |
|---------|----------|
| Full-bleed primary + centered hero wastes hierarchy on flyers / board notices / QR wallets | `alignmentBias`, `typeScale`, `density`; `CanvasTypeBlock` |
| QR codes feel stamped-on afterthoughts | `qrPlate` (`white-card` / `inset` / `flush`) + `CanvasQrPlate` |
| Meeting backgrounds already solve face-safe asymmetry | Do not flatten; use as reference for `asymmetric` bias later |
| Flat brand fields look identical across locals | Style packages `solid` / `field` / `workshop` |
| Texture / photo energy missing without breaking PNG export | `surface: grain` (tiled PNG soft-light) + `surface: duotone` (grayscale + multiply/screen) |

## Style packages

| Id | Voice | Default tokens |
|----|-------|----------------|
| *(omit / Classic)* | Legacy | center, roomy, compact, white-card, flat |
| `solid` | Modern / app-clean | start, roomy, display, white-card, soft-gradient |
| `field` | Grassroots | center, tight, display, inset, **grain** |
| `workshop` | Modular | start, roomy, compact, flush, accent-band |

Advanced Brand Kit controls can override any token after a package apply.

## Surfaces (export-safe)

- **flat** — solid primary
- **soft-gradient** — primary → secondary linear
- **accent-band** — thin accent strip + primary fill
- **grain** — procedural PNG tile via `getGrainTileDataUrl()` + `mix-blend-mode: soft-light` (no SVG `feTurbulence` — capture fragility)
- **duotone** — member photos in Graphic Maker: grayscale + brand multiply/screen (`CanvasDuotonePhoto`)

QR **modules stay black/white** for scan reliability; only the plate chrome is tokenized.

## Schema

`BrandKit.canvas?: BrandKitCanvas` on [`src/types/entities.ts`](../../src/types/entities.ts). Normalize via `normalizeBrandKitCanvas` in [`canvas-tokens.ts`](../../src/lib/utils/canvas-tokens.ts). Resolve with `resolveCanvasTokens(brandKit)`.

## Primitives

[`src/components/tools/canvas/`](../../src/components/tools/canvas/)

- `CanvasBrandHeader` / `CanvasTypeBlock` / `CanvasQrPlate`
- `CanvasGrainOverlay` / `CanvasDuotonePhoto`

## Migration register

| Family | Status |
|--------|--------|
| Brand Kit UI (`BrandKitCanvasPanel`) | done |
| Flyer Maker | done | QOL v2: layouts, paper sizes, system font stacks, QR/photo, invite email |
| Board Notice | done |
| QR Card | done |
| Action Card | done |
| Pulse Poll | done |
| Graphic Maker / `graphic-layouts` (+ duotone photos) | done |
| QR Board (grain + surface + `CanvasQrPlate` slots) | done |
| Solidarity Poster (surface + grain + QR plate) | done |
| Meeting Background (surface + grain on capture root) | done |
| Document Generator `OfficePresetMock` type scale | done |
| Quote Card (`QuoteLayout` tokens) | done |
| Phase 3 — layout matrix tokenization (`typeScale` / `density` / `asymmetric`) | done |
| Phase 4 — wallet family + Notice + Pulse type chrome | done |
| Phase 5 — remaining tools + QR plate chrome | done |
| Board Banner / Trim | done |
| Logo Builder (`LocalLogoPlate`) | done |
| Omnichannel Resizer | done |
| Website Template (CSS knobs) | done |

### Phase 3 notes

- `typeScaleFactor`, `contentPaddingPx`, `meetingAlignFromBias` in `canvas-tokens.ts`
- Meeting Background: headline rem scale + token padding + asymmetric face-safe anchors
- Solidarity stack: token padding + alignment bias; QR size responds to density
- Flyer / Board Notice: meta blocks use `subtitleFontSizePx` / `gapPx`
- Graphic `results`: alignment + padding from tokens
- Brand Kit mini preview: QR placement follows alignment bias; `CanvasTypeBlock` asymmetric inset

### Phase 4 notes

- Wallet helpers: `walletTitleFontSizePx` / `walletBodyFontSizePx` / `walletMetaFontSizePx` / `walletContentPaddingPx` / `walletContentGapPx`
- QR Card + Action Card: type / pad / gap / alignment bias (QR plate stays centered)
- Graphic `notice`: surface + grain + pad / type / header justify from tokens
- Pulse Poll: surface + wallet type/pad; Meeting `side-panel`: token pad (`bandPadPx`)

### Phase 5 notes

- Board Banner + Trim: `clampTypeRem` / `bannerPadPercent`; surface/grain on lockup & stripe layouts
- Logo Builder / Resizer: `LocalLogoPlate` + frame surfaces take canvas tokens
- Website ZIP/preview CSS: optional `canvas` surface / typeScale / density
- `CanvasQrPlate`: soft shadow + optional accent-tinted border (modules stay black/white)

### Stop-gap pass (2026-08-06)

- Graphic Maker: Solidarity / Spotlight / Quote / Results share `layoutChrome` (pad / type / align); Notice reuses it
- QR Board: title / cell type + padding / header alignment from tokens
- Board Notice lead/type labels; Quote Card outer surface; Solidarity headline weight/tracking

### Stop-gap pass 2 (2026-08-06)

- Meeting: layout field fills yield to Brand Kit soft-gradient / grain / accent-band on the capture root
- QR / Action Card plain+accentBar modes use `canvasSurfaceStyle`
- Solidarity split/banner padding + title chrome; Office mock body pad via `officeMockPaddingPx`

### Editor readability (2026-08-07)

- Dense tool side panels use shared `ToolFormDetails` (collapsed by default) so primary choices stay above the fold
- Board Banner & Trim: ornaments / print size / colours collapse; clearer section hierarchy + readable hint type
- Meeting Background: toggles / size / colours collapse the same way
- QR Board: options + colours collapse; title/format/slots stay primary
- Document Generator: text fields first; branding + ZIP outputs collapse; form column slightly wider at `xl`
- Wallet family: QR Card + Action Card options/colours collapse
- Solidarity, Pulse Poll, Quote Card, Logo Builder, Resizer, Flyer Maker, Graphic Maker: colours/options collapsed
- Shared `common.sectionOptions` / `sectionColours` / `sectionAdvanced` labels
- `ToolEditorLayout` xl grid gives the form column a slight width preference for scannability

### Edge clearance (2026-08-12)

- Shared `src/lib/utils/edge-clearance.ts` profiles (`desktop` / `ultrawide` / `phone` / `meeting` / `print`) inset type/chrome via absolute box, not CSS padding-% (padding percentages are width-relative).
- `CanvasEdgeClearanceFrame` (inside capture) + `CanvasSafeZoneOverlay` (outside capture). Colour/grain stay full-bleed.
- Solidarity Poster: digital default on, print default off. Meeting Backgrounds: default on. Resizer keeps preview-only 10% overlay (`SOCIAL_SAFE_ZONE_INSETS`); no baked inset.

## Agent contract

See [`.cursor/rules/comms-visual-system.mdc`](../../.cursor/rules/comms-visual-system.mdc).
