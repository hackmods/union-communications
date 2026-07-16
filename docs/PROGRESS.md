# Progress Log

## Milestone 1–10 — Comms v1 (2026-07-07)
Scaffold through testing/CI — all complete.

## Phase 0 — Platform Documentation (2026-07-08) — COMPLETE

- [x] `docs/VISION.md` — multi-union vision, tenancy, design principles
- [x] `docs/ARCHITECTURE.md` — stack, auth options, DataAdapter, RLS
- [x] `docs/RBAC.md` — roles matrix, solo accounts, invitation flow
- [x] `docs/COMPLIANCE.md` — PIPEDA, FIPPA, AODA, breach playbook
- [x] `docs/ROADMAP.md` — phases 0–5
- [x] `docs/DATA_MODELS.md` — entity reference
- [x] `docs/modules/COMMS.md`, `GRIEVANCE.md`, `COLLEGE_BUMPING.md`
- [x] `AGENTS.md` — Cursor agent entry point
- [x] ADRs 007–012 in `docs/DECISIONS.md`
- [x] `seed/reference-tenant-opseu-caat.json` — reference tenant seed
- [x] `.cursor/rules/platform.mdc` — hub-wide rules
- [x] `.cursor/rules/comms-module.mdc`, `grievance-module.mdc`, `bumping-module.mdc`
- [x] `.cursor/rules/project.mdc` — deprecated pointer to platform.mdc
- [x] Local 243 easter egg — `resolveLocalNumber()` in `src/lib/utils/local.ts`

## Phase 1 — Platform Shell (2026-07-08) — COMPLETE

- [x] Auth.js credentials provider + session JWT
- [x] MFA scaffold (`/app/mfa`, `POST /api/mfa/verify`, dev 6-digit accept)
- [x] Middleware protects `/app/*` (except login)
- [x] Tenant types + loader from `seed/reference-tenant-opseu-caat.json`
- [x] Module registry (`comms`, `grievance`, `bumping`) + hub nav
- [x] Hub routes: `/app`, `/app/login`, `/app/mfa`, grievance/bumping placeholders
- [x] MFA guard on confidential module pages
- [x] Audit log adapter foundation (memory adapter)
- [x] `BRAND_COLORS` from tenant loader; deprecated `CAAT_OPSEU_COLORS` alias
- [x] Package renamed to `local-union-hub`
- [x] Playwright uses `npm run dev` web server
- [x] Unit tests for tenant loader + module registry
- [ ] Multi-union onboarding UI (deferred — seed-only for now)
- [x] `.env.example` (AUTH_SECRET, AUTH_URL)

## Phase 2 — Grievance MVP (2026-07-08) — COMPLETE

- [x] Grievance types, memory adapter with seed data
- [x] CRUD API with MFA + RBAC + audit logging
- [x] Deadline calculator from CAConfig
- [x] Dashboard: open/overdue/upcoming counts
- [x] Create grievance, detail view with timeline
- [x] Immutable officer notes
- [x] CA step escalation checklist
- [x] Email draft templates (EN/FR) — copy only, never auto-send
- [x] Export grievance bundle (JSON + PDF in ZIP)
- [ ] Document attachments with virus scan (deferred)
- [ ] Persistent DB storage (memory adapter for MVP)

## Phase 3 — College Bumping MVP (2026-07-08) — COMPLETE

- [x] BumpingCase types, memory adapter with seed data
- [x] CRUD API with MFA + RBAC + audit logging
- [x] Module enabled check per tenant
- [x] Client-side PDF/text extraction (`pdfjs-dist`)
- [x] Side-by-side position diff viewer
- [x] Configurable comparison checklist
- [x] Committee sessions and notes
- [x] Decision record (committee decides — not auto-decided)
- [x] Decision log export (JSON + PDF in ZIP)
- [x] Demo user: `stability@local243.ca`
- [ ] Server-side PDF storage + virus scan (deferred)
- [ ] Persistent DB storage (memory adapter for MVP)

## Phase 4 — Hybrid Mode (2026-07-10) — COMPLETE

- [x] Web Crypto passphrase encryption (PBKDF2 + AES-GCM)
- [x] Hybrid data slice format for grievance + bumping (`lunion-hybrid-v1`)
- [x] MFA-gated API: `GET/POST /api/hybrid/slice` with audit (`hybrid.export` / `hybrid.import`)
- [x] Encrypted file export/import UI at `/app/hybrid` (passphrase stays client-side)
- [x] Optional browser local encrypted slice (save / restore / clear)
- [x] Data mode preference (`central` | `local`) via LocalStorage adapter
- [x] Memory adapter `importLocalSlice` (merge / replace) for grievance + bumping
- [x] Hub nav link + EN/FR i18n
- [x] Unit tests for encrypt round-trip, wrong passphrase, tenant scope

## Phase 5 — QOL (2026-07-10) — COMPLETE

- [x] Officer handoff wizard (`/app/handoff`) — reassign cases + download package
- [x] CA clause snippet library (`/app/snippets`) — union-scoped CRUD + insert into notes
- [x] Meeting scheduler with ICS export on grievance detail + deadline ICS
- [x] Member communication log (channel/direction/summary) on grievance detail
- [x] Dedicated overdue dashboard (`/app/overdue`) with days-overdue sorting
- [x] Within-union template marketplace (`/app/marketplace`) — never cross-union
- [x] Mobile steward read-only mode (preference + compact UI)
- [x] Hub nav + dashboard links; EN/FR i18n
- [x] Unit tests for ICS builder and handoff package

## Post–Phase 5 Polish (2026-07-10) — COMPLETE

- [x] Role-gated hub Tools menu (handoff hidden for non-presidents)
- [x] Snippet/marketplace write CTAs respect RBAC + steward mobile read-only
- [x] Hybrid data-mode copy clarified (preference ≠ live data path)
- [x] Meeting ICS re-download; email draft select labeled
- [x] Adapter unit tests (snippets, marketplace, communications, meetings)
- [x] Hub smoke: unauthenticated redirect, login→MFA, login axe
- [x] `.env.example` committed (`!.env.example` in gitignore)
- [x] Removed unused `HubDashboard.tsx` duplicate
- [x] RBAC docs: steward assigned R/W clarified

## Nav & dual-audience IA (2026-07-11) — COMPLETE

- [x] Slim public header: Get started · Learn ▾ · Brand Kit · Tools ▾ · Officer Hub CTA
- [x] Social Examples / Captions demoted to Learn + footer + Social channel
- [x] Home dual paths (comms roadmap vs Officer Hub); broader subtitle
- [x] Hub labels: Officer tools menu; Comms toolbox module name
- [x] Social Media Plan step 3 links Captions / Examples / Blueprint
- [x] `docs/modules/COMMS.md` sitemap updated

## Social Examples uplift (2026-07-11) — COMPLETE

- [x] Brand-aware post mockups (layouts: solidarity, spotlight, notice, quote, results, thanks)
- [x] Why-it-works notes + CTAs into Graphic Maker (`?preset=`), Captions (`?caption=`), Quote Card, Flyer Maker
- [x] Nine themed examples; full EN/FR copy; Social Media Plan footer link
- [x] Smoke: `/examples` asserts Graphic Maker CTA

## Deferred (future)

- [ ] Multi-union onboarding UI → **Phase 6**
- [ ] Persistent Postgres + RLS → **Phase 6**
- [ ] Workforce Time full (scheduling, PTO, union rollup) → **Phase 8** (8-lite shipped)
- [ ] Comms content backlog (email/broadcast guide, Get started beyond social rename + Print step) → [`docs/modules/COMMS_BACKLOG.md`](modules/COMMS_BACKLOG.md)
- [x] Photo consent / member media checklist → `/guide/photo-consent` (Learn → Guides)

## Public nav — channel guides in Learn (2026-07-14) — COMPLETE

- [x] Learn → **By channel**: Print, Union Boards, Website guides (`Header.tsx`)
- [x] Footer: Print Guide
- [x] Brand Kit → `/assets` link; i18n `learnGroupChannels` EN/FR
- [x] Spec + agent rules: `COMMS.md`, `comms-public-nav.mdc`, `COMMS_BACKLOG.md`

## Landing page — align + desktop layout (2026-07-14) — COMPLETE

- [x] Hero band with CTAs + trust aside (`lg` split); Share/privacy secondary
- [x] Hub-off: compact coming-soon rail (not a twin dashed card)
- [x] Brand Kit sticky rail + `/assets` / Logo Builder links
- [x] Toolbox: boards → print → social → website; capped tiles; `xl:grid-cols-4`
- [x] Closing CTAs: Get started / Resources / Blueprint; home-enter motion; EN/FR copy

## Phase 8-lite — Workforce Time (2026-07-12) — COMPLETE

- [x] Module `"time"` in `HubModule`, registry, reference seed, cursor rule
- [x] Types, memory adapter, RBAC (`access.ts`), MFA session gate
- [x] APIs: entries list, clock-in/out, submit/approve/reject, job codes, CSV export
- [x] Hub pages: `/app/time`, `/app/time/admin`
- [x] Optional GPS punch tagging (client checkbox; geofence helper server-side)
- [x] Categories: staff, release, duty_bank, action, volunteer
- [x] EN/FR i18n; unit tests for access + geofence
- [x] Spec: `docs/modules/WORKFORCE_TIME.md`; plan in `.cursor/plans/`

- [ ] Document/PDF attachments with virus scan → **Phase 7**
- [ ] Hybrid live local data path → **Phase 6**
- [ ] Stronger MFA + audit log UI → **Phase 7**

Cursor agent rules updated 2026-07-11: `roadmap-next.mdc`, `hybrid-qol.mdc`, refreshed `platform.mdc` / `grievance-module.mdc` / `AGENTS.md`.

## Accessibility & Display Settings (2026-07-09) — COMPLETE

- [x] Root `rem` font scaling via `--text-scale` and `data-font-size` attributes
- [x] User display preferences: font size (4 tiers), high contrast, reduced motion
- [x] Preferences persisted via DataAdapter (`lunion-user-preferences` key)
- [x] `PreferencesProvider` + FOUC-prevention inline script
- [x] Display settings panel on `/accessibility` + header quick-access menu
- [x] Baseline typography bump: header, footer, language toggle to `text-base`
- [x] Skip link to `#main-content`; accessibility page i18n (EN/FR, tenant-neutral)
- [x] Expanded axe smoke coverage (home, guide, accessibility, brand-kit — serious+critical)
- [x] Unit tests for preferences store and `applyPreferencesToDocument`

## Comms Toolbox Aug 18 Expansion (2026-07-10) — COMPLETE

(Historical) Workshop hub shipped at `/guide/materials`. Later reworked into **Comms Resources** at `/guide/resources` (2026-07-12); legacy URL redirects.

- [x] Social Media Plan roadmap at `/guide/social-media-plan`
- [x] Home page restructured by four channels (social, print, union boards, website)
- [x] Board Notice Maker — letter + tabloid PNG/PDF export
- [x] Union boards, print, and website guides
- [x] Website Template tool — local243.org-based static site ZIP with OPSEU header
- [x] Blueprint chapters moved to i18n; channel guide links added
- [x] Nav renamed: Social Examples; new tools in header dropdown
- [x] Demo Brand Kit seed at `public/demo/brand-kit-local-243.json`
- [x] Facilitator script at `docs/workshop/aug-18-comms-toolbox.md`
- [x] COMMS.md updated for four-channel coverage
- [x] Workshop materials hub at `/guide/materials` with attendee checklist and source bibliography (later → Comms Resources)
- [x] `SourcesBlock` on all guides and tools; `docs/SOURCES.md` reference registry

## Comms Resources + Learn IA (2026-07-12)

- [x] Rework Workshop Materials into **Comms Resources** at `/guide/resources` (orientation, practice, facilitators, bibliography)
- [x] Permanent redirect `/guide/materials` → `/guide/resources`
- [x] Learn menu grouped (Guides / Libraries); Plan + Blueprint intros aligned to clear roles
- [x] Aug 18 date framing moved to facilitator doc only

- [x] Cursor design brief: `.cursor/rules/solidarity-posters.mdc`
- [x] `/tools/solidarity-poster` — stack / split / banner; Print (letter/tabloid PNG+PDF) + Digital wallpapers (16:9 desktop / 19.5:9 wide / 9:16 phone, PNG only; CTA + QR toggles)
- [x] Generic solidarity slogan presets (`SOLIDARITY_SLOGANS`)
- [x] Optional QR + support URL footer; local Brand Kit lockup when theme established
- [x] PNG/PDF export; EN/FR i18n; home boards channel + header nav

## Client Office Export (DOCX/XLSX) (2026-07-14)

- [x] `src/lib/export/office-export.ts` — browser-only DOCX (docxtemplater + pizzip) and XLSX (ExcelJS); dynamic import on export click
- [x] Sample templates at `public/templates/office/{docx,xlsx}/`
- [x] `OfficeExportButton` + EN/FR download labels; reuses `downloadBlob` / `formatFilename`
- [x] Unit tests for template cache + render/download path

## Document & Slide Generator (2026-07-15)

- [x] `/tools/document-generator` — recommended presets, colour themes → discrete baseline templates, tag-mapped fields
- [x] PPTX via pptxgenjs (4 demo slides + embedded palette); ZIP bundle of selected formats
- [x] Color-variant templates under `public/templates/office/` (+ `scripts/generate-office-sample-templates.mjs`)
- [x] EN/FR, Header Tools, COMMS module notes

## Pristine Office Templates + Brand Kit Logos (2026-07-15)

- [x] Ready-to-use letterhead / simple letter quick starts + upgraded grievance / event / poster packs
- [x] DOCX letterhead `{%logo}` via `docxtemplater-image-module-free` + `resolveBrandLogoBytes` (Brand Kit)
- [x] Per-preset PPTX decks with optional logo; Steps / RSVP Excel sheets; structure preview UI
- [x] Plan: `.cursor/plans/pristine_office_templates.plan.md`

## Document Generator Quality Redo (2026-07-15)

- [x] Three examples only (simple letter, letterhead, event notice) — Brand Kit colours, no red/blue stubs
- [x] Word built with `docx` library (header logo + live palette); Excel RSVP from scratch; pptxgenjs decks
- [x] Page UX: example tiles + editor | live `OfficePresetMock` preview
- [x] Plan: Doc Gen Quality Redo

## Union Boards Guide Expansion (2026-07-11)

- [x] Bare-minimum board zones: header, socials/QR, health & safety, LEC list, events/rotating
- [x] What-to-print checklist (always / rotate / optional / sizes)
- [x] IRL-inspired reference layouts (four-quadrant, priority strip, corridor tall, steward desk)
- [x] Schematic diagrams + CTAs to board notice and solidarity poster tools
- [x] Official Ontario posters (ESA, Form 82) + e-Laws OHSA links to feed empty boards
- [x] Anonymized sample checklist / board tracker / JHSC CSV (fake names, no college PII)
- [x] Example dense-board photo for visual reference
- [x] Campus board photos (sectioned L33 + branded W010) + labeled-columns schematic

## Board Banner & Trim Maker (2026-07-15)

- [x] `/tools/board-banner` — Brand Kit header banners (slant / centered / minimal) + side/bottom/corner trim tiles
- [x] Landscape letter (11×8.5) and tabloid (17×11); PNG + PDF; tile-join copy for wider boards
- [x] Cross-linked from Union Boards Guide header zone + CTAs

## Board Banner strip pack QoL (2026-07-15)

- [x] Portrait letter/tabloid **pack sheets** with multiple short strips (2.5 / 3.5 / 4.5″) and cut marks
- [x] Vertical side columns + corner grid; SVG slant (no logo clip-path); Solidarity-grade editor UX

## Board trim ornaments + side rail (2026-07-15)

- [x] Shared Ornaments: chevrons / LOCAL / logo lockup|mark|none / byline (banner + trim)
- [x] Side redesigned as dual-tone rail + end caps — chevrons never drawn on sides
- [x] Cursor rule `.cursor/rules/board-banner.mdc`

## Board frame kit multi-select (2026-07-15)

- [x] Frame trim kit: Side and/or Bottom rails + Corner always included
- [x] Multi-page PDF / ZIP export per piece type; works without header banner

## QR Board Poster Maker (2026-07-15)

- [x] `/tools/qr-board` — multi-QR union board posters (title above QR, URL under)
- [x] Board presets: two campaigns (2), core links (4), full board kit (6); add/remove to 2–8
- [x] Letter + tabloid print; PNG + PDF; Brand Kit colours, saved links, local branding
- [x] EN/FR, Header Tools, union-boards guide CTA, unit tests for grid/presets

## QR Link Card Maker (2026-07-11)

- [x] `/tools/qr-card` — title, optional description, tagline under QR
- [x] Background modes: plain, gradient, accent bar; Brand Kit colours
- [x] Print sizes: quarter / half / letter / 5×5 / 4×4; PNG + PDF
- [x] Presets for support, ESA, OHSA, H&S, socials, website

## Brand Kit Local Links (2026-07-11)

- [x] BrandKit v1.1: optional `websiteUrl`, `facebookUrl`, `customLinks[]`
- [x] Normalize 1.0 → 1.1 on hydrate/import
- [x] `LocalLinksEditor` on onboarding + Brand Kit
- [x] QR cards / solidarity posters / website template consume saved links

## UnionOps public launch rebrand (2026-07-11)

- [x] Global rebrand: Local Union Support Hub → **UnionOps**; slogan **Solidarity.**
- [x] Homepage hero, trust banner, footer copy, Share this Tool
- [x] SEO/metadata for https://unionops.org (title template, description, keywords, canonical)
- [x] Open Graph + Twitter cards; per-tool OG titles; `/og-image.png`
- [x] PWA manifest + offline shell service worker stub
- [x] `/manifesto` linked quietly from the homepage trust banner (not header/footer chrome)
- [x] PWA SW only registers on unionops.org; Playwright blocks service workers

## GitHub presence & privacy honesty (2026-07-11)

- [x] Source-available `LICENSE` (ARR); stewarded by Ryan Morris
- [x] `SECURITY.md`, `CONTRIBUTING.md`, CoC, issue/PR templates
- [x] `docs/guides/SETUP.md` + `DEPLOY.md`; README rewrite with badges + two-tier privacy
- [x] Privacy page + EN/FR trust/manifesto/SEO copy: Comms on-device; host = data controller
- [x] GHCR release workflow on `v*` tags (`ghcr.io/hackmods/union-communications`)
- [x] Agent morale snowmobile easter egg (`.cursor/easter-eggs/`)

## Host brand defaults + Logo Builder save (2026-07-12)

- [x] Logo Builder **Save to Brand Kit** — colours, local #, sub-text apply site-wide (chrome via `--opseu-*` + `--brand-*`)
- [x] `config/host-brand.json` + schema/example for self-host default palette and local details
- [x] `npm run brand:set` CLI; `NEXT_PUBLIC_BRAND_*` / `NEXT_PUBLIC_DEFAULT_*` env overrides
- [x] `DEFAULT_BRAND_KIT` / `BRAND_COLORS` resolve from host defaults (platform orange), not OPSEU seed

## Quiet Support page (2026-07-12)

- [x] `/support` — optional Buy Me a Coffee tip jar (`buymeacoffee.com/ryanmorris`)
- [x] Linked from manifesto + muted footer link (not header nav)

## UnionOps interlocking logo (2026-07-12)

- [x] Platform mark: interlocking lowercase u+o (replaces condensed U monogram)
- [x] Brand Kit primary → o / plate; graphics accent (secondary) → u (ignore photo charcoal)
- [x] Live tint via `UnionOpsMark` + static `public/assets/unionops/*.svg`; source PNGs in `source/`
- [x] Favicon `src/app/icon.svg` + OG/Twitter mark in `opengraph-image.tsx`
- [x] Canonical monochrome PNG `logo-mark-interlock.png` — CSS-mask overlay (not live SVG paths); `onDark` white back plate
- [x] Favicon `src/app/icon.png`; OG embeds interlock PNG on white plate

## Brand Kit logo options by attached assets (2026-07-12)

- [x] Hide union-specific wordmark/mark radios unless the preset has attached logos (`hasAttachedUnionLogos`) — only OPSEU today
- [x] Non-OPSEU presets omit `logos`; Brand Kit shows UnionOps mark + upload (Other/CUPE/etc. selections stay selectable)
- [x] Guard against treating UnionOps fallback paths as union logo modes

## Officer Hub public launch toggle (2026-07-13)

- [x] `NEXT_PUBLIC_OFFICER_HUB_PUBLIC` — when unset/false, hide header hub CTA; home shows Comms-focused copy + “coming soon” officer card; Docker/CI soft-launch defaults to on
- [x] `NEXT_PUBLIC_DEMO_SITE` — authenticated hub Demo banner on workshop/demo hosts (sample data notice)
- [x] SEO/share blurb, footer, manifesto, privacy, and PWA `start_url` adjust for soft launch
- [x] `/app` remains reachable for demos and CI
