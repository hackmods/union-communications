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
| Flyer Maker | done |
| Board Notice | done |
| QR Card | done |
| Action Card | done |
| Pulse Poll | done |
| Graphic Maker / `graphic-layouts` (+ duotone photos) | done |
| QR Board (grain + tokens prop) | done |
| Solidarity Poster / Meeting Background token wiring | later (keep layout matrices) |
| Document Generator Office mock type scale | later |

## Agent contract

See [`.cursor/rules/comms-visual-system.mdc`](../../.cursor/rules/comms-visual-system.mdc).
