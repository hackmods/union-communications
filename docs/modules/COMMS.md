# Comms Module

## Status: v1.1 — Four-Channel Communications Toolbox

Public-facing communications toolbox covering social media, print, union boards, and local websites. Client-side image generation and static site export.

## Public navigation (IA)

Top bar is slim and dual-audience oriented:

| Item | Route / contents |
|------|------------------|
| **Get started** | `/onboarding` when Brand Kit is not established; `/guide/social-media-plan` (First week) when it is — Brand Kit stays a separate link |
| **Guides ▾** | **Start here:** Comms Resources, Blueprint, First week, Strike Guide, Photo Consent, Membership signup · **By channel:** Print, Union Boards, Website · **Libraries:** Social Examples, Captions · **About:** Brand Assets, Why it's free, Install as an app |
| **Brand Kit** | `/brand-kit` (on-page link to `/assets` Brand Asset Pack) |
| **Tools ▾** | Mega-menu columns — **Brand:** Logo, Resizer, Documents · **Union boards:** Banner, Notice, Solidarity, QR Board, QR Cards · **Print:** Flyer · **Social & web:** Graphic Maker, Quote Card, Meeting Backgrounds, Website, Alt-text · footer **All tools** → `/tools` |
| **Officer Hub** | `/app` (auth) — filled primary CTA |

Footer includes Blueprint, Tools, Print Guide, Social Examples, Captions, Comms Resources, Brand Assets, Why it's free, Install, Privacy, Accessibility, Support.

Social Examples and Captions are **not** top-level nav items. They remain under Guides, the home Social channel, footer links, and First week step 3. Channel guides (print / boards / website) live under Guides → By channel so the four-channel model is discoverable without flattening Guides into a long link bar.

Home landing (`HomeContent`): desktop hero band with Brand Kit primary CTA + “What’s next” roadmap secondary; dual-path cards (comms vs Officer Hub, or compact “coming soon” rail when hub is off); Brand Kit link row above a four-column toolbox (boards → print → social → website). First week (`/guide/social-media-plan`) is the channel roadmap **after** Brand Kit. Deferred content ideas: [`COMMS_BACKLOG.md`](COMMS_BACKLOG.md). Agent nav conventions: `.cursor/rules/comms-public-nav.mdc`.

## Routes

| Route | Description |
|-------|-------------|
| `/[locale]/` | Landing — Brand Kit step 0 CTA + channel toolbox |
| `/[locale]/onboarding` | Brand setup wizard (union preset, local details, colours, logo) |
| `/[locale]/brand-kit` | Brand Kit home base — purpose + export/import branding JSON (colours, logo, website & key links) |
| `/[locale]/tools` | Tools catalog — channel-grouped links to every maker |
| `/[locale]/guide` | The Blueprint handbook |
| `/[locale]/guide/social-media-plan` | First-week roadmap after Brand Kit: brand → boards → socials → website |
| `/[locale]/guide/resources` | Comms Resources — orientation, practice checklist, presentation + workshop outlines, bibliography (`/guide/materials` redirects here) |
| `/[locale]/guide/crisis` | Crisis comms playbook |
| `/[locale]/guide/photo-consent` | Photo consent & member media checklist for stewards and workshops |
| `/[locale]/guide/union-boards` | Workplace bulletin board guide (bare-minimum layout, ministry posters, anonymized templates, IRL reference patterns) |
| `/[locale]/guide/print` | Print communications guide |
| `/[locale]/guide/website` | Local website deploy guide |
| `/[locale]/install` | PWA / desktop install guide — Guides → About + footer |
| `/[locale]/examples` | Social examples gallery — brand-aware mockups, why-it-works notes, handoff to Graphic Maker / Captions / Quote Card / Flyer |
| `/[locale]/captions` | Caption & hashtag library |
| `/[locale]/assets` | Union asset pack (CAAT OPSEU reference) |
| `/[locale]/tools/logo-builder` | Local logo (circle, square, rectangle) |
| `/[locale]/tools/board-notice` | Workplace bulletin notices (letter + tabloid) |
| `/[locale]/tools/board-banner` | Board header banners + frame trim on packed letter/tabloid sheets (strip heights + side columns; PNG + PDF) |
| `/[locale]/tools/solidarity-poster` | Solidarity board posters + wallpapers (Print; Digital 16:9 / 19.5:9 / 9:16 PNG; CTA + QR toggles) |
| `/[locale]/tools/meeting-background` | Zoom/Teams virtual backgrounds (Bold + Minimal design sets; landscape 16:9 HD/UHD + portrait 9:16; face-safe layouts + layer toggles) |
| `/[locale]/tools/qr-card` | QR link cards (title, tagline, multi-size print; join / FT / PT membership presets) |
| `/[locale]/tools/action-card` | Action / petition QR cards (headline, ask, deadline; QR → officer-supplied external sign-on URL; PNG + PDF) |
| `/[locale]/tools/qr-board` | Multi-QR board posters (2–8 links; letter/tabloid; PNG + PDF; Membership FT+PT preset) |
| `/[locale]/guide/membership-signup` | Membership growth guide — Brand Kit links → QR materials → welcome letter |
| `/[locale]/tools/graphic-maker` | Social graphics |
| `/[locale]/tools/resizer` | Omnichannel resizer — Logo Builder plate (circle/square/rectangle) or upload; social + custom sizes at true pixels; ZIP/PNG |
| `/[locale]/tools/quote-card` | Leadership quote cards |
| `/[locale]/tools/flyer-maker` | Picket/rally flyers |
| `/[locale]/tools/website-template` | GitHub Pages site ZIP export |
| `/[locale]/tools/document-generator` | Branded Word / Excel / PowerPoint + ZIP (simple letter, letterhead, welcome letter, event notice) |
| `/[locale]/tools/alt-text` | Alt-text draft helper (starters, platform limits, checklist) |

## Channels

| Channel | Tools & guides |
|---------|----------------|
| **Social** | Blueprint, crisis guide, captions, examples, graphic maker, resizer, quote card, alt-text |
| **Print** | Flyer maker, print guide |
| **Union boards** | Board notice maker, solidarity poster maker, QR link cards, action cards, QR board posters, union boards guide (bare-minimum + reference layouts) |
| **Website** | Website template (based on local243.org model), website guide |

## Multi-Union Migration Checklist (Phase 1)

- [x] Move `CAAT_OPSEU_COLORS` to per-union `brandDefaults` (`BRAND_COLORS` from tenant loader)
- [x] Extend Brand Kit schema v2: `unionId`, `unionName`, `divisionName`, FT/PT profiles
- [x] Default local number fallback via `resolveLocalNumber()` (easter egg: 243)
- [x] Platform-neutral metadata titles in `messages/*.json`
- [ ] Rename asset pack to `UnionAssetPack` pattern; CAAT pack = reference seed
- [ ] Replace remaining hardcoded "OPSEU" / "CAAT" strings with `UnionConfig.name` where still present

## Public vs Authenticated

v1: all public. Phase 1+: optional premium templates behind login; core tools stay public.

## Key Components

- `src/lib/export/image-export.ts` — PNG/SVG/ZIP export
- `src/lib/export/office-export.ts` — DOCX via `docx` builders + Brand Kit; XLSX (ExcelJS); PPTX (pptxgenjs); ZIP bundles
- `src/lib/export/office-docx-builders.ts` — simple / welcome letter / letterhead / event notice Word layouts
- `src/lib/export/brand-logo-bytes.ts` — Brand Kit → PNG bytes for Word/PPT
- `src/components/tools/OfficePresetMock.tsx` — live CSS document preview + example tiles
- `src/components/tools/OfficeExportButton.tsx` — shared Word/Excel download control (legacy templates)
- `src/lib/constants/office-templates.ts` — Document Generator presets (incl. welcome letter)
- `src/components/brand/MembershipUrlsEditor.tsx` — typed FT/PT membership application URLs on Brand Kit
- `src/lib/utils/local-links.ts` — Brand Kit link normalize + membership preset destination resolve
- `src/lib/templates/website/generate-website-zip.ts` — static site ZIP generator
- `src/components/tools/*` — upload, contrast, consent, undo/redo, office export
- `src/store/brand-store.ts` — brand state via DataAdapter
