# Comms Module

## Status: v1.1 — Four-Channel Communications Toolbox

Public-facing communications toolbox covering social media, print, union boards, and local websites. Client-side image generation and static site export.

## Routes

| Route | Description |
|-------|-------------|
| `/[locale]/` | Landing — channel-organized toolbox |
| `/[locale]/onboarding` | Brand setup wizard |
| `/[locale]/brand-kit` | Export/import branding JSON |
| `/[locale]/guide` | The Blueprint handbook |
| `/[locale]/guide/social-media-plan` | Quick roadmap: logo → boards → socials → website |
| `/[locale]/guide/materials` | Workshop handouts, checklist, source bibliography |
| `/[locale]/guide/crisis` | Crisis comms playbook |
| `/[locale]/guide/union-boards` | Workplace bulletin board guide |
| `/[locale]/guide/print` | Print communications guide |
| `/[locale]/guide/website` | Local website deploy guide |
| `/[locale]/examples` | Social media example gallery |
| `/[locale]/captions` | Caption & hashtag library |
| `/[locale]/assets` | Union asset pack (CAAT OPSEU reference) |
| `/[locale]/tools/logo-builder` | Circular local logo |
| `/[locale]/tools/board-notice` | Workplace bulletin notices (letter + tabloid) |
| `/[locale]/tools/graphic-maker` | Social graphics |
| `/[locale]/tools/resizer` | Platform image resizer |
| `/[locale]/tools/quote-card` | Leadership quote cards |
| `/[locale]/tools/flyer-maker` | Picket/rally flyers |
| `/[locale]/tools/website-template` | GitHub Pages site ZIP export |
| `/[locale]/tools/alt-text` | Alt-text assistant |

## Channels

| Channel | Tools & guides |
|---------|----------------|
| **Social** | Blueprint, crisis guide, captions, examples, graphic maker, resizer, quote card, alt-text |
| **Print** | Flyer maker, print guide |
| **Union boards** | Board notice maker, union boards guide |
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
- `src/lib/templates/website/generate-website-zip.ts` — static site ZIP generator
- `src/components/tools/*` — upload, contrast, consent, undo/redo
- `src/store/brand-store.ts` — brand state via DataAdapter
