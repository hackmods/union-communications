# Comms Module

## Office export engine (2026-09-20)

Document Generator and Hub Word consumers use the shared Office export foundation. DOCX/DOTX font finalization follows Word's reversed-GUID obfuscation rules and merges the generated font table; PPTX stores raw TTF bytes and schema-valid regular/bold relationships. Every Office package is checked for ZIP integrity, required parts, content-type coverage, relationship resolution, and font signatures before download. DOCX-capable presets also expose a matching `.dotx`, which is included in the preset ZIP.

Shared interfaces live in `office-design-tokens.ts`, `office-package-validator.ts`, and `ooxml-font-embed.ts`. System fonts remain an unembedded no-op. Licensed catalog fonts retain their OFL notice.

## Status: v1.2 — Four-Channel Toolbox + Fifth-Channel Email Guide

Public-facing communications toolbox covering social media, print, union boards, and local websites. Client-side image generation and static site export.

## Public navigation (IA)

The public header uses Brand Kit, Create, Worksheets, Learn, and Platform; account destinations keep their existing session and launch gates. Search is a separate utility and is visible from tablet widths. The wordmark links to Home. Guided setup remains on /start and is linked early on Home rather than added as another primary destination.

Home now has six sections: a two-zone hero with manually selected live examples; three task groups at #home-work (communications, workplace preparation, learning); optional Brand Kit reuse; Officer Hub and Local Portal with localized synthetic examples; privacy/cost answers; and guided setup/support. The primary action is Find a tool. Hosted services remain access-controlled and may recover hosting costs. Public tool storage and intentional Hub handoffs are unchanged.

The homepage uses the existing wide shell and brand tokens. Header and platform-anchor offsets use the measured sticky-header height. No analytics or marketing dependencies were added. See [public-marketing-ux.mdc](../../.cursor/rules/public-marketing-ux.mdc) and [COMMS_BACKLOG.md](COMMS_BACKLOG.md).

## Routes

| Route | Description |
|-------|-------------|
| `/[locale]/` | Landing — Brand Kit step 0 CTA + channel toolbox |
| `/[locale]/onboarding` | Brand setup wizard (union preset, local details, colours, logo) |
| `/[locale]/brand-kit` | Brand Kit home base — purpose + export/import branding JSON (colours, logo, website & key links) |
| `/[locale]/tools` | Tools catalog — channel-grouped links to every maker |
| `/[locale]/guide` | The Blueprint handbook |
| `/[locale]/guide/social-media-plan` | First-week roadmap after Brand Kit: brand → boards → print → socials → website |
| `/[locale]/guide/resources` | Comms Resources — orientation, practice checklist, presentation + workshop outlines, bibliography (`/guide/materials` redirects here) |
| `/[locale]/guide/strike` | Strike operations playbook — kits, gate coverage from numbers, captain training, member care, return to work, printable captains' brief |
| `/[locale]/guide/crisis` | Crisis comms playbook |
| `/[locale]/guide/photo-consent` | Photo consent & member media — member protection, three event settings, immediate take-down, and a before-you-post checklist |
| `/[locale]/guide/union-boards` | Workplace bulletin board guide (bare-minimum layout, ministry posters, anonymized templates, IRL reference patterns) |
| `/[locale]/guide/print` | Print communications guide |
| `/[locale]/guide/website` | Local website guide: plan and write the ZIP, then publish on GitHub Pages |
| `/[locale]/guide/email-broadcast` | Fifth-channel email & outreach guide — write here, send from your inbox; BCC and personal addresses; no marketing lists |
| `/[locale]/guide/short-form` | Short-form video practice — filming, phone editors, pointing Reels/Shorts at a campaign ask; stills from Graphic Maker Portrait / Resizer Story |
| `/[locale]/updates` | What's new — dated, filterable notes of new tools, guides, and improvements (not an engineering changelog) |
| `/[locale]/manifesto` | Built in solidarity — Comms stay free; hosted Officer Hub / Local Portal has a hosting cost; self-host stays an option |
| `/[locale]/install` | PWA / desktop install guide — Guides → Libraries & about + footer |
| `/[locale]/examples` | Social examples gallery — brand-aware mockups, why-it-works notes, handoff to Graphic Maker / Captions / Quote Card / Flyer |
| `/[locale]/captions` | Caption & hashtag library |
| `/[locale]/assets` | Union asset pack (CAAT OPSEU reference) |
| `/[locale]/tools/logo-builder` | Local logo (circle, square, rectangle) |
| `/[locale]/tools/board-notice` | Workplace bulletin notices (letter + tabloid) |
| `/[locale]/tools/board-banner` | Board header banners + frame trim on packed letter/tabloid sheets (strip heights + side columns + four upright corner tiles; PNG + PDF) |
| `/[locale]/tools/solidarity-poster` | Solidarity board posters + wallpapers (Print; Digital 16:9 / 19.5:9 / 9:16 PNG; CTA + QR toggles; extra edge clearance on Digital) |
| `/[locale]/tools/meeting-background` | Zoom/Teams virtual backgrounds (Bold + Minimal; landscape 16:9 HD/UHD + portrait 9:16; face-safe layouts; extra edge clearance default off) |
| `/[locale]/tools/qr-card` | QR link cards (title, tagline, multi-size print; join / FT / PT membership presets) |
| `/[locale]/tools/action-card` | Action / petition QR cards (headline, ask, deadline; QR → officer-supplied external sign-on URL; PNG + PDF) |
| `/[locale]/tools/qr-board` | Multi-QR board posters (2–8 links; letter/tabloid; PNG + PDF; Membership FT+PT preset) |
| `/[locale]/tools/org-chart` | Who-to-contact **poster** or **directory** (letter/tabloid portrait + landscape PNG + PDF); on-device officers/stewards roster; JSON/CSV; hydrates Website Template |
| `/[locale]/guide/membership-signup` | Membership growth guide — Brand Kit links → QR materials → welcome letter |
| `/[locale]/guide/union-history` | How Canadian unions connect — two-track affiliation map; Local 243 worked example |
| `/[locale]/tools/graphic-maker` | Social graphics (landscape, square, 9:16 portrait) |
| `/[locale]/tools/resizer` | Omnichannel resizer — Logo Builder plate (circle/square/rectangle) or upload; social + custom sizes at true pixels; ZIP/PNG |
| `/[locale]/tools/quote-card` | Leadership quote cards (stripe / centered / large mark; square, landscape, 9:16; `?preset=` / `?aspect=` / `?layout=`) |
| `/[locale]/tools/flyer-maker` | Picket/rally flyers |
| `/[locale]/tools/website-template` | GitHub Pages site ZIP (default) + classic WordPress theme ZIP with Appearance → Local site updates; not a full CMS. UnionOps does not host WordPress. Squarespace 7.1 theme export is a non-option: [`plan-2026-08-18-website-export-wp-squarespace.md`](../audit/plan-2026-08-18-website-export-wp-squarespace.md) |
| `/[locale]/tools/document-generator` | Branded Word / Excel / PowerPoint + ZIP (simple letter, letterhead, welcome letter, event notice) |
| `/[locale]/tools/alt-text` | Alt-text draft helper (starters, platform limits, checklist) |
| `/[locale]/guide/officer-learning` | Officer Learning Center — **ten** self-paced modules (scenarios, floor checklists, quizzes, pocket PDFs). Progress on-device (`unionops-officer-learning-progress`). Top-level header link, not under Guides ▾. Module slugs under `/guide/officer-learning/{slug}` — see [`session-knowledge-2026-09-06-officer-learning-modules-7-10.md`](../audit/session-knowledge-2026-09-06-officer-learning-modules-7-10.md) |

## Channels

| Channel | Tools & guides |
|---------|----------------|
| **Social** | Blueprint, crisis guide, captions, examples, graphic maker, resizer, quote card, alt-text, **short-form video guide** |
| **Print** | Flyer maker, print guide; pocket QR / action cards live under Tools → Print & cards |
| **Union boards** | Board banner, board notice, solidarity poster, QR board posters, **Org Chart**, union boards guide (bare-minimum + reference layouts) |
| **Website** | Website template (based on local243.org model), website guide — GitHub Pages ZIP default; WordPress classic theme with Local site / JSON updates; not Squarespace |
| **Email (fifth channel)** | Email & outreach guide — complements boards/print/social/website; officer SMTP/cron stays Hub-only |

The four-channel model (boards → print → social → website) remains the First week roadmap. Email is documented as an optional fifth channel for officer outreach copy and Hub SMTP boundaries — not a member broadcast list. Short-form video is **channel practice** under social (not a fifth Tools column and not an in-browser editor).

Website Template is a **fixed one-page static generator** (`WebsiteTemplateData` → HTML/CSS/JS ZIP for GitHub Pages by default). The WordPress theme ZIP is data-driven: homepage copy lives in a WP option (Appearance → Local site + JSON import); UnionOps does not host WordPress. **Squarespace 7.1 theme / developer-mode export is a non-option**. Do not advertise a Squarespace template. Full matrix: [`plan-2026-08-18-website-export-wp-squarespace.md`](../audit/plan-2026-08-18-website-export-wp-squarespace.md), [`.cursor/rules/website-export.mdc`](../../.cursor/rules/website-export.mdc).

## Multi-Union Migration Checklist (Phase 1)

- [x] Move `CAAT_OPSEU_COLORS` to per-union `brandDefaults` (`BRAND_COLORS` from tenant loader)
- [x] Extend Brand Kit schema v2: `unionId`, `unionName`, `divisionName`, collection profiles (OPSEU CAAT Support FT/PT; one Local elsewhere)
- [x] Default local number fallback via `resolveLocalNumber()` (easter egg: 777)
- [x] Platform-neutral metadata titles in `messages/*.json`
- [ ] Rename asset pack to `UnionAssetPack` pattern; CAAT pack = reference seed
- [ ] Replace remaining hardcoded "OPSEU" / "CAAT" strings with `UnionConfig.name` where still present

## External bibliography & link rot

Cited national union and government URLs are **not** owned by UnionOps. When a reference tenant’s parent union reorganizes its public site, deep links in guides may 404 — that is **upstream**, not a toolbox deploy bug.

| Piece | Location |
|-------|----------|
| Canonical URL registry | `src/lib/constants/comms-sources.ts` |
| Per-guide footers | `SourcesBlock` + `PAGE_SOURCE_IDS` |
| Full bibliography | `/guide/resources` |
| Mirrored logos (when national download pages move) | `/assets`, `public/assets/caat-opseu/` (OPSEU reference only; gated by Brand Kit preset — see LINK-002) |
| Website ZIP national footer | `getOpseuWebsiteFooterSources()` in `generate-website-zip.ts` |
| Agent playbook | `docs/audit/external-links-audit-plan.md`, `docs/audit/session-knowledge-2026-07-30.md` (**LINK-001**) |
| Cursor rule | `.cursor/rules/external-links.mdc` |

Steward copy: `sources.intro` in `messages/en.json` / `fr.json`. Update registry first; sync `docs/SOURCES.md`.

## Multi-brand architecture (Looks, collections, Hub scope)

UnionOps separates three layers — do not collapse them:

| Layer | Storage | Job |
|-------|---------|-----|
| **Look** | `BrandKit.identityPackId` + `campaignPlate` | Colours + official logos (`IDENTITY_PACKS` in `src/lib/brand/identity-packs.ts`) |
| **Collection profile** | `BrandKit.activeProfileId` | Who you speak as (sub-text, membership URL) |
| **Hub bargaining unit** | JWT `bargainingUnitId` | Casework API scope (grievance, tasks, …) |

Runtime theming is **state-driven** (`BrandProvider` → CSS custom properties on `:root`), not `.theme-*` root classes.

### Shipped Looks (OPSEU preset)

| Pack id | Sector | Plates |
|---------|--------|--------|
| `opseu-national` | all | single blue |
| `opseu-caat-s` | `caat-support` | coral, gold |
| `opseu-caat-a` | `caat-academic` | burgundy, coalition blue |

Discoverability facade: `src/lib/brand/brand-registry.ts` (re-exports — not a parallel token store).

### Coalition / joint bargaining (Comms)

- `src/components/comms/campaign/` — `BargainingBanner`, `JointActionCard`, `SolidarityBadge`
- Optional `BrandKit.campaignBadge` — caucus overlay on Brand Kit coalition preview
- Dual Look pairs via `resolveDualIdentityLooks()` for future unified CAAT graphics

### Explicitly deferred (good reasons)

| Skipped | Why |
|---------|-----|
| `brand.config.ts` duplicate registry | Data lives in `identity-packs.ts`, `unionPresets.ts`, sector catalogs |
| `.theme-catt-a` CSS class switcher | `identityPackId` + `BrandProvider` already switch theme |
| Rebuild Hub context switcher | `HubContextSwitcher` + validated JWT updates shipped |
| Hub / marketing shell theming | Comms-only v1; Officer Hub chrome stays platform grey/orange until a later milestone |
| Merge collection profiles ↔ bargaining units | ADR-013 — CAAT-S one comms identity, Hub FT/PT units for casework |

### Bridge (hint only)

`BrandKitContextHint` on `/brand-kit` reminds signed-in officers that Hub collection filters and Brand Kit profiles are separate — no auto-sync.

## Public vs Authenticated

v1: all public. Phase 1+: optional premium templates behind login; core tools stay public.

## Key Components

- `src/lib/export/image-export.ts` — PNG/SVG/ZIP export
- `src/lib/export/office-export.ts` — DOCX via `docx` builders + Brand Kit; XLSX (ExcelJS); PPTX (pptxgenjs); ZIP bundles
- `src/lib/export/office-docx-builders.ts` — simple / welcome letter / letterhead / event notice Word layouts
- `src/lib/export/brand-logo-bytes.ts` — Brand Kit → PNG bytes for Word/PPT
- `src/components/tools/OfficePresetMock.tsx` — live CSS document preview + example tiles
- Document Generator builds Word/Excel/PowerPoint via `src/lib/export/office-export.ts` (Brand Kit colours/logo; ExcelJS RSVP sheets; pptxgenjs decks; ZIP bundles). Route: `/tools/document-generator`
- `src/lib/constants/office-templates.ts` — Document Generator presets (incl. welcome letter, seniority worksheet, blank branded **LEC directory** — no roster pull)
- `src/components/brand/MembershipUrlsEditor.tsx` — membership application URLs on Brand Kit (FT/PT audience only for College Support)
- `src/lib/utils/local-links.ts` — Brand Kit link normalize + membership preset destination resolve
- `src/lib/templates/website/generate-website-zip.ts` — static site ZIP generator (GitHub Pages default)
- `src/lib/templates/website/generate-wordpress-theme-zip.ts` — classic WordPress theme ZIP (data-driven Local site admin; not FSE)
- `src/lib/templates/website/wordpress/build-php.ts` — config / render / admin / customizer PHP builders
- `src/components/tools/*` — upload, contrast, consent, undo/redo, office export
- `src/store/brand-store.ts` — brand state via DataAdapter
- `src/lib/utils/canvas-tokens.ts` — Brand Kit canvas chrome resolver (`solid` / `field` / `workshop`, grain, duotone)
- `docs/modules/COMMS_VISUAL_SYSTEM.md` — visual system + migration register
- `src/components/tools/canvas/` — shared export primitives (`CanvasQrPlate`, grain, duotone photo)
