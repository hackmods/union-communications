# Comms Module

## Status: v1.1 — Four-Channel Communications Toolbox

Public-facing communications toolbox covering social media, print, union boards, and local websites. Client-side image generation and static site export.

## Public navigation (IA)

Top bar is slim and dual-audience oriented:

| Item | Route / contents |
|------|------------------|
| **Get started** | `/guide/social-media-plan` |
| **Learn ▾** | Comms Resources, Blueprint, Strike Guide · Social Examples, Captions |
| **Brand Kit** | `/brand-kit` |
| **Tools ▾** | Logo, boards, graphics, flyer, website, alt-text makers |
| **Officer Hub** | `/app` (auth) — visually distinct CTA |

Social Examples and Captions are **not** top-level nav items. They remain under Learn, the home Social channel, footer links, and Social Media Plan step 3.

Home page offers two entry paths: comms roadmap (Get started) vs Officer Hub (grievances / bumping / QOL).

## Routes

| Route | Description |
|-------|-------------|
| `/[locale]/` | Landing — dual paths + channel-organized toolbox |
| `/[locale]/onboarding` | Brand setup wizard |
| `/[locale]/brand-kit` | Export/import branding JSON (colours, logo, website & key links) |
| `/[locale]/guide` | The Blueprint handbook |
| `/[locale]/guide/social-media-plan` | Quick roadmap: logo → boards → socials → website |
| `/[locale]/guide/resources` | Comms Resources — orientation, practice checklist, bibliography (`/guide/materials` redirects here) |
| `/[locale]/guide/crisis` | Crisis comms playbook |
| `/[locale]/guide/union-boards` | Workplace bulletin board guide (bare-minimum layout, ministry posters, anonymized templates, IRL reference patterns) |
| `/[locale]/guide/print` | Print communications guide |
| `/[locale]/guide/website` | Local website deploy guide |
| `/[locale]/examples` | Social examples gallery — brand-aware mockups, why-it-works notes, handoff to Graphic Maker / Captions / Quote Card / Flyer |
| `/[locale]/captions` | Caption & hashtag library |
| `/[locale]/assets` | Union asset pack (CAAT OPSEU reference) |
| `/[locale]/tools/logo-builder` | Local logo (circle, square, rectangle) |
| `/[locale]/tools/board-notice` | Workplace bulletin notices (letter + tabloid) |
| `/[locale]/tools/solidarity-poster` | Solidarity board posters + wallpapers (Print letter/tabloid; Digital horizontal/vertical PNG) |
| `/[locale]/tools/qr-card` | QR link cards (title, tagline, multi-size print) |
| `/[locale]/tools/graphic-maker` | Social graphics |
| `/[locale]/tools/resizer` | Platform image resizer |
| `/[locale]/tools/quote-card` | Leadership quote cards |
| `/[locale]/tools/flyer-maker` | Picket/rally flyers |
| `/[locale]/tools/website-template` | GitHub Pages site ZIP export |
| `/[locale]/tools/alt-text` | Alt-text draft helper (starters, platform limits, checklist) |

## Channels

| Channel | Tools & guides |
|---------|----------------|
| **Social** | Blueprint, crisis guide, captions, examples, graphic maker, resizer, quote card, alt-text |
| **Print** | Flyer maker, print guide |
| **Union boards** | Board notice maker, solidarity poster maker, QR link cards, union boards guide (bare-minimum + reference layouts) |
| **Website** | Website template (based on local243.org model), website guide |

## Multi-Union Migration Checklist (Phase 1)

- [ ] Replace hardcoded "OPSEU" / "CAAT" strings with `UnionConfig.name`
- [x] Move `CAAT_OPSEU_COLORS` to per-union `brandDefaults` (`BRAND_COLORS` from tenant loader)
- [ ] Rename asset pack to `UnionAssetPack` pattern; CAAT pack = reference seed
- [ ] Extend Brand Kit schema v2: `unionId`, `unionName`, `divisionName`
- [x] Default local number fallback via `resolveLocalNumber()` (easter egg: 243)
- [x] Platform-neutral metadata titles in `messages/*.json`

## Public vs Authenticated

v1: all public. Phase 1+: optional premium templates behind login; core tools stay public.

## Key Components

- `src/lib/export/image-export.ts` — PNG/SVG/ZIP export
- `src/lib/export/office-export.ts` — client-side DOCX (docxtemplater) / XLSX (ExcelJS); lazy-loaded on export click; templates under `public/templates/office/`
- `src/components/tools/OfficeExportButton.tsx` — shared Word/Excel download control
- `src/lib/templates/website/generate-website-zip.ts` — static site ZIP generator
- `src/components/tools/*` — upload, contrast, consent, undo/redo, office export
- `src/store/brand-store.ts` — brand state via DataAdapter
