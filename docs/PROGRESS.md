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
- [x] Multi-union onboarding UI → Phase 6 (`/app/onboarding`, invites)
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
- [x] Document attachments — durable local + S3 object storage, ClamAV HTTP scan, SSE-S3 (FEAT-001; CMEK stretch)
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

## Public nav UX polish (2026-07-17) — COMPLETE

- [x] Header mega-menu / dropdown refactor (`nav-config`, `NavDropdown`, Tools multi-column, mobile accordion drawer)
- [x] Get started → onboarding or First week roadmap (no Brand Kit duplicate); outline CTA vs filled Officer Hub
- [x] First week H1 EN/FR; Learn → Guides includes First week; `/tools` catalog + All tools + footer Tools
- [x] `aria-current="page"`, keyboard menu arrows, Escape/outside close; COMMS + nav rules updated
- [x] Rename Learn → **Guides**; About group promotes Assets / Manifesto / Install; footer peers
- [x] HubNav Officer tools: Escape/outside-click, aria-expanded, arrow keys, aria-current

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

- [x] Multi-union onboarding UI → **Phase 6** (shipped 2026-07-23 — memory overlay + invite accept)
- [ ] Persistent Postgres + RLS (`unionId` / `localId` / `bargainingUnitId`) → **Phase 6** — scaffold + adapters + seed/app-role/smoke closed (`SEC-003`); flip host backends from memory when ready
- [ ] Workforce Time full (scheduling, PTO, union rollup) → **Phase 8** (8-lite + 8-lite+ shipped)
- [ ] Comms content backlog (email/broadcast guide; First week Print step + remaining copy sweep) → [`docs/modules/COMMS_BACKLOG.md`](modules/COMMS_BACKLOG.md)
- [x] Photo consent / member media checklist → `/guide/photo-consent` (Learn → Guides)

## Phase 6.0–6.4 multi-scope + Phase 7 scaffolds (2026-07-17) — COMPLETE (memory)

- [x] ADR-013 Collection / BargainingUnit; VISION / DATA_MODELS / RBAC / ROADMAP updated
- [x] Reference seed: Local 243 + 560; FT/PT collections with distinct CA deadlines
- [x] Hub context switcher; elevated cross-local grievance access; demo division admin + PT steward
- [x] Grievance / snippet filters by `bargainingUnitId`; `resolveGrievanceConfig`
- [x] Brand Kit v2 profiles (FT/PT); website about copy FT+PT Support Staff
- [x] `/app/audit` query UI; attachment API + scan stub; MFA fixed-code (`AUTH_DEV_MFA_CODE`)
- [x] Unit tests: tenant loader + cross-local grievance access


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

## Phase 8-lite+ — Time ranges & entry needed (2026-07-16) — COMPLETE

- [x] Manual/retro time ranges (`manual_range`) for self-entry after events
- [x] Bulk union-business events: one range → ad-hoc multi-worker group (`bulk_event`)
- [x] Lite worker roster + expected windows; needed tracking (window miss + weekday gaps)
- [x] Union-business report JSON + CSV export with `from`/`to` and event columns
- [x] EN/FR i18n; unit tests for overlap + needed computation

- [ ] Document/PDF attachments with virus scan → **Phase 7**
- [x] Hybrid live local data path → **Phase 6**
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

## From Scratch to Solidarity presentation (2026-07-15)

- [x] Comms Resources card: presentation outline with interleaved Q&A + remote tinker note (EN/FR)
- [x] Facilitator run sheet at `docs/workshop/from-scratch-to-solidarity.md`
- [x] Existing hands-on workshop card retained; SOURCES.md points at both run sheets

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

## Calendar meetings scope + RSVP R0 (2026-07-18)

- [x] Spec + agent rule: `docs/modules/CALENDAR_MEETINGS.md`, `.cursor/rules/calendar-meetings.mdc`
- [x] Hybrid LEC RSVP Excel: Attending + On site/Remote, quorum board, food heads, dietary
- [x] Event `.ics` from Calendar start/end (`src/lib/calendar/event-ics.ts`) in Document Generator ZIP
- [x] Copy-only RSVP invite email (`src/lib/comms/event-email.ts`) — public tool, no auto-send
- [x] Phased live RSVP design (R1 Hub + `/r/[token]` with `joinMode`) — no member portal
- [ ] **R0.5 (planned):** matching invite-email on Board Notice / printables — `.cursor/plans/hybrid_lec_rsvp_outreach.plan.md`

## Phase 6/7 close-out + Calendar R1/R3 + E2E (2026-07-24)

- [x] MFA opt-in via `AUTH_MFA_ENABLED` (**default off** for demos/usability); when enabled, production rejects `shared_code_insecure` unless break-glass; unenrolled TOTP users gated to `/app/mfa/setup`
- [x] Hybrid live-local path: unlocked browser slice drives grievance/bumping read/write; Sync to hub remains manual
- [x] Calendar R1: `UnionMeeting` / `RsvpToken` / `RsvpResponse`, migration `0019`, Hub Events board, public `/r/[token]`
- [x] Transactional SMTP R3 (ADR-016) — officer reminder, RSVP confirm, invite send when `EMAIL_ENABLED`
- [x] Unit: recurrence, tallies, MFA policy, hybrid live-session, email mocks, polls/officers access
- [x] Playwright: `hub.org`, `rsvp.smoke`, `mfa.setup`, `hybrid.smoke`; expanded `hub.a11y`

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

## Action Card Maker (2026-07-23)

- [x] `/tools/action-card` — headline, ask, deadline, CTA; QR → external petition URL
- [x] Reuses QR card sizes / export path; Brand Kit theme; EN/FR; Tools → Union boards nav
- [x] MVP only — no in-product signature collection (`FUTURE-005` CLOSED)

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

## Meeting Background Maker (2026-07-15)

- [x] Cursor design brief: `.cursor/rules/meeting-backgrounds.mdc`
- [x] `/tools/meeting-background` — corner / lower-third / side-panel / bands; HD 1920×1080 + UHD 3840×2160 PNG
- [x] Solidarity-energy presets + lead-in/headline/closer toggles that collapse empty bars; fluid headline sizing for narrow panels
- [x] Header Tools + home Social channel; EN/FR i18n; smoke visit

## Meeting Background Minimal + Portrait (2026-07-16)

- [x] Design sets: Bold (existing landscape layouts unchanged) + Minimal (`masthead` / `footer` / `rails` / `upper-stack`)
- [x] Portrait orientation: 9:16 HD 1080×1920 + UHD 2160×3840; Portrait forces Minimal
- [x] Same route `/tools/meeting-background` — Design / Orientation / Layout / Size SegControls

## SEO architecture + builder compactness + home hero (2026-07-16)

- [x] Favicon suite: `favicon.ico` / `.svg`, Apple touch, PWA 192/512, Safari pinned tab; manifest icons updated
- [x] Adaptive favicon: host brand primary plate + auto black/white glyph (`pickContrastingInk`); SVG `prefers-color-scheme` for dark tab chrome; `npm run brand:favicons`
- [x] Locale-aware `generateMetadata` + hreflang/canonical/OG/Twitter; bilingual `TOOL_SEO`; JSON-LD Organization + WebApplication
- [x] `robots.ts` + bilingual `sitemap.ts`; hub `/app` noindex
- [x] Brand-first full-bleed home hero (UnionOps mark + headline budget); trust/share below fold
- [x] `ToolEditorLayout` (sticky preview, mobile Edit/Preview); denser Card/Input; SegControl; Logo/Notice/Graphic migrated
- [x] Playwright: SEO helpers, builder coverage, mobile project (`@mobile`)

## PWA install guide + coverage (2026-07-16)

- [x] Quiet `/install` page (EN/FR) — Chrome/Edge install steps, Safari Add to Dock/Home Screen, offline-shell limits
- [x] Muted footer link + support/privacy cross-links; kept out of Header/Learn/Tools (`comms-public-nav.mdc`, `pwa.mdc`)
- [x] Extracted `src/lib/pwa/*` (hosts, register, manifest builder, shell constants) for testable installability
- [x] Unit tests: host gate, SW sync register/unregister, Chromium manifest criteria, `sw.js`↔`shell.ts` sync, icon files, i18n keys
- [x] Cursor rule `.cursor/rules/pwa.mdc` — keep coverage when touching PWA surfaces

## PWA installability harden (2026-07-16)

- [x] Apex-only SW host gate (`unionops.org`) — drop `www` until CapRover stub redirects with trusted TLS
- [x] `appleWebApp.capable` metadata for standalone iOS home-screen launches
- [x] `/install` EN/FR: PC omnibox Install, Android Install vs shortcut, Safari never auto-prompts
- [x] Verified production apex: manifest, `/sw.js` + `Service-Worker-Allowed`, 192/512 + apple-touch icons

## PWA Brand Kit chrome (2026-07-17)

- [x] Client `syncPwaBrandChrome`: Brand Kit primary → `theme-color` meta, theme cookie, blob manifest, generated 192/512 icons
- [x] Server `/manifest.webmanifest` reads `uo_pwa_theme` cookie for `theme_color` (hex only; no Brand Kit payload stored server-side)
- [x] `/install` notes OS may need reopen/reinstall after colour changes

## Sitewide tool + secondary UX alignment (2026-07-16)

- [x] All canvas builders on `ToolEditorLayout` (sticky preview; mobile Edit/Preview); board-banner dual preview + SegControl
- [x] Alt-text + document-generator densified (no fake tabs); Card/Input/Button focus polish
- [x] Header mobile drawer; Footer wrap/tap targets; HubNav scroll; app shell vertical rhythm
- [x] Guide/library/legal/auth Callout face uplift; `.cursor/rules/tool-editor-ux.mdc` status register complete
- [x] Playwright: secondary pages, all canvas Edit/Preview `@mobile`, mobile nav + overflow checks; 71 `@smoke` passing

## Membership signup materials (2026-07-18)

- [x] Brand Kit `membershipUrls[]` (audience FT/PT/all + primary) with seed defaults for OPSEU/CAAT EMA
- [x] QR Card join presets, QR Board FT+PT dual sheet, Solidarity Poster membership slogans + URL picker
- [x] Document Generator Welcome letter preset (generic onboarding copy + membership URL token)
- [x] Guide `/guide/membership-signup` + nav / sitemap / Blueprint channel link
- [x] Unit tests for membership resolve + welcome letter docx

## Audit Phase 1 — Security & Auth Hardening (2026-07-23)

- [x] `SEC-001` / `SEC-005` — MFA grant nonce + JWT update allowlist; `localId`/`bargainingUnitId` validated server-side
- [x] `SEC-002` — `AUTH_MFA_MODE` fail-closed in production; shared-code opt-in; interim TOTP verifier for demo users
- [x] `SEC-004` — `AUTH_SECRET` fail-closed at production runtime; compose requires secret
- [x] `SEC-008` — CSP/security headers in `next.config.ts` (all hosts)
- [x] `SEC-010` — `env.example` deprecated; `.env.example` is canonical
- [x] `RBAC-002` — `/app` and `/app/audit` server `auth()` gates
- [x] API route auth coverage test; unit regression suite for session update / MFA policy

## Audit Phase 2 (partial) — Validation & RBAC (2026-07-23)

- [x] `SEC-006` — Zod schemas for grievance/bumping create/update; adapter field allowlists; mass-assignment tests
- [x] `RBAC-001` — snippet/marketplace DELETE uses `canDeleteSharedContent` (includes `division_admin`)
- [x] `SEC-003` (scaffold) — Drizzle schemas + migration, `DATABASE_URL` client, docker `db` service, backend flags, memory-data Hub banner
- [x] `SEC-003` (grievance adapter) — `DrizzleGrievanceAdapter` + `grievanceStore` proxy; flip with `GRIEVANCE_DB_BACKEND=postgres`
- [x] `SEC-003` (bumping + audit adapters) — Drizzle adapters + store proxies; RLS migration `0002_rls_policies.sql` + `rls-context.ts`
- [x] `SEC-003` (close-out) — idempotent `db:seed`, `0008_app_role` (`unionops_app`), compose app-role URL + backend passthrough, RLS contract test + `db:rls-smoke`, `db:durability-smoke`; defaults stay memory until operators flip
- [x] `SEC-009` — hybrid slice `Cache-Control: no-store` + COMPLIANCE/UI residual-risk copy
- [x] `RBAC-003` — cross-module `rbac-matrix.test.ts`
- [x] `FEAT-004` — `GrievanceOutcome` entity (type, Zod, Drizzle table, memory/drizzle adapters, `/api/grievances/[id]/outcome`); follow-ups closed 2026-07-24 (detail UI, export bundle, `appealDays`)
- [x] `FEAT-005` — advisory seniority aid (`compareSeniority` / `rankEligibleBumpers`, seed roster, `GET /api/bumping/seniority`); not a binding decision engine
- [x] `FEAT-002` — Discussions v1 (`DiscussionThread`/`DiscussionPost`, memory + `DISCUSSIONS_DB_BACKEND`, migration `0007`, Hub module + `/app/discussions` + APIs; linked-case ACL)
- [x] `FEAT-006` — Hub calendar aggregation (`/app/calendar`, `GET /api/calendar`) of grievance meetings + bumping sessions; MFA/role gated; multi-event ICS export; HubNav link
- [x] `UX-001` — App Router `error.tsx` / `loading.tsx` / `not-found.tsx` for `[locale]` + Hub `/app`; shared `Skeleton`; EN/FR `routeUi` copy
- [x] `SEC-007` — bcrypt auth path; demo roster production-gated; Postgres users via `AUTH_USERS_BACKEND`; invite create/accept APIs (email + password-reset deferred)
- [x] Time module Drizzle adapter + store (`TIME_DB_BACKEND`); migrations `0004_time_tables` / `0005_time_rls`
- [x] `FEAT-001` — durable attachments: local FS + S3-compatible (`@aws-sdk/client-s3`, SSE-S3 AES256), ClamAV HTTP client (`ATTACHMENT_SCANNER_URL` → `POST /scan`), Documents vault; CMEK / signed-URL upload remain stretch
- [x] `TOOL-001` / `TOOL-006` / `TOOL-007` — LocalStorage try/catch + session fallback; Brand Kit v2 write-back; `opseu-*` → `unionops-*` keys
- [x] `TOOL-002` — `useExportHandler` + danger Callout on canvas tool exports
- [x] `FEAT-003` — Task entity + Hub board (`/app/tasks`, `MyTasksWidget`, CRUD `/api/tasks`, `"tasks"` HubModule); memory default + optional `TASKS_DB_BACKEND=postgres` (`DrizzleTaskAdapter`, migration `0009_tasks` + RLS; `0008` reserved for parallel SEC-003)
- [x] `FUTURE-002` / `FUTURE-003` / `FUTURE-004` — labour rights guides: `/guide/dfr`, `/guide/seniority-bumping`, `/guide/right-to-refuse` (EN/FR, not-legal-advice Callouts); Blueprint related links + labour strip; sitemap; Hub bumping → seniority playbook link
- [x] `FUTURE-001` — Steward Quick-Log (`InformalLogEntry`, `"informalLog"` HubModule, `/app/informal-log`, CRUD `/api/informal-log`, convert-to-grievance); memory default + optional `INFORMAL_LOG_DB_BACKEND=postgres` (migration `0010_informal_log` + RLS)
- [x] `ORG-001` — Meeting minutes with motions (`MeetingMinutes`/`Motion`, memory + optional `MINUTES_DB_BACKEND=postgres`, migration `0012_meeting_minutes` + RLS; `0011` reserved for officers); CRUD `/api/minutes` + approve; Hub `/app/minutes` list/create/detail; DOCX export; EN/FR + HubNav
- [x] `FUTURE-005` — Action Card / QR petition builder MVP (`/tools/action-card`): headline/ask/deadline/CTA, Brand Kit theme, QR → external petition URL, PNG/PDF; no in-product signatures
- [x] `UX-003` — Flyer/Graphic Maker `ContrastChecker` uses `pickContrastingInk(primary)` (not hardcoded `#FFFFFF`); unit test for WCAG pass/fail vs canvas ink
- [x] `UX-004` — Brand Kit contrast advisory → enforce via `brandPaletteHasContrastRisk` / ink helpers; inline warning + confirm-before-save (Brand Kit, onboarding, Logo Builder)
- [x] `TOOL-004` — dynamic `import()` for `html-to-image` / `jspdf` / `docx` in export helpers (no static module-scope pulls)
- [x] `TOOL-005` — unit tests for `pdf-export` + `ToolEditorLayout` / `BoardTrimCanvas` (mobile panes, trim prop rendering)
- [x] `TOOL-003` — PWA offline shell precaches `/en/` + `/fr/`; locale-aware navigation fallback + manifest `start_url`
- [x] `UI-001` — shared `Select` / `Checkbox` / `Radio` / `Dialog` / `Badge`; migrated TimeDashboard + document-generator (+ GrievanceDashboard / Hybrid radios / ConsentModal); `primitives.test.tsx`
- [x] `UI-002` — Hub mobile-first: `PAGE_SHELL.wide` app body; Grievance/Bumping dense KPI + stacked CTAs/rows; Time header CTAs; `@mobile` hub overflow specs + auth helper
- [x] `UX-002` — `EmptyState` + `Skeleton` on main Hub lists (grievance/bumping/time/audit/snippets/marketplace/overdue/handoff/tasks); Playwright visual smoke deferred
- [x] `UI-005` — canvas preview `role="group"` + accessible name via `ToolEditorLayout.previewAccessibleName`; `BoardTrimCanvas.accessibleName`; solidarity-poster + board-banner EN/FR summaries
- [x] `UI-004` — system font stack confirmed intentional; ADR-014 (no `next/font` / no remote webfonts)
- [x] `UI-003` — axe smoke on authenticated Hub (grievances/bumping/time/calendar/discussions/tasks/documents/audit) + expanded canvas tools; shared `e2e/helpers/axe.ts`; serial MFA login
- [x] `ORG-005` — read-only Hub reports (`/app/reports`, `GET /api/reports/summary`): date-range rollups over grievance/bumping/time stores; elevated RBAC; CSV/XLSX/PDF export; HubNav + EN/FR
- [x] `ORG-002` — officer roster with term dates (`OfficerRosterEntry`, memory + optional `OFFICERS_DB_BACKEND=postgres`, migration `0011_officer_roster` + RLS); CRUD `/api/officers`; Hub `/app/officers` with term-expiring banner; president/admin gate; EN/FR + HubNav
- [x] `ORG-006` — discretionary fund ledger (`LedgerEntry`, memory + optional `LEDGER_DB_BACKEND=postgres`, migration `0013_ledger` + RLS); CRUD `/api/ledger`; Hub `/app/ledger` running balance + CSV/XLSX; EN/FR + HubNav
- [x] `ORG-004` — internal committees (`Committee`, memory + optional `COMMITTEES_DB_BACKEND=postgres`, migration `0014_committees` + RLS); CRUD `/api/committees`; Hub `/app/committees`; president/elevated gate; EN/FR + HubNav
- [x] `ORG-003` — nominations + printable ballot (`ElectionCycle`/`Nomination`, memory + optional `ELECTIONS_DB_BACKEND=postgres`, migration `0015_elections` + RLS); Hub `/app/elections`; DOCX ballot; manual tallies; promote-to-roster; **no online voting**; EN/FR + HubNav
- [x] `ORG-008` — travel authorization + cash advance + expense reconcile (`TravelAuthorization`/`CashAdvance`/`ExpenseClaim`, memory + optional `TRAVEL_DB_BACKEND=postgres`, migration `0016_travel` + RLS); ledger posts on advance/reconcile; `/api/travel/**`; Hub `/app/travel`; PDF/XLSX + receipt ZIP (`buildReceiptZip` + `listForExpenseClaim` + object storage); `AttachmentMeta.expenseClaimId`; no SAP/ERP
- [x] `FUTURE-006` — Pulse Poll authoring + response collection (`PollDefinition`/`PollResponse`, memory + optional `POLLS_DB_BACKEND=postgres`, migration `0017_polls` + RLS); public `/poll/[slug]` + consent submit API; Hub `/app/polls` aggregates + CSV/XLSX; Publish from `/tools/pulse-poll`; ADR-015
- [x] `ORG-007` — acknowledged Non-Build (dues/per-capita/member-HR); export-hook posture only

## Phase 6 — Multi-union onboarding + invite UI (2026-07-23) — COMPLETE (memory overlay)

- [x] Runtime tenant overlay (`src/lib/tenant/overlay.ts`) merged by loader — locals/collections + new unions
- [x] New unions use host Brand Kit defaults + empty asset pack — **never** clone OPSEU/CAAT seed
- [x] Hub wizard `/app/onboarding` (+ alias `/app/settings/tenant`) for `local_president` / `union_admin` / `platform_admin`
- [x] `GET`/`POST /api/tenant` (MFA; create_local / create_collection / create_union)
- [x] Invite create UI `/app/invites` + public accept `/app/invite/[token]` (password → POST accept → login)
- [x] HubNav links (invites via `canManageInvites`; tenant setup via `canManageTenantOnboarding`)
- [x] Proxy allows unauthenticated `/app/invite/*`; EN/FR copy; ROADMAP checkbox closed

## Phase 6/7 — ApiAdapter + TOTP enrollment (2026-07-23)

- [x] `ApiAdapter` (`src/lib/data/api-adapter.ts`) implementing `DataAdapter` over `GET/PUT /api/brand-kit` and `GET/PUT /api/preferences`; memory store keyed `unionId:userId` (`src/lib/hub-settings/store.ts`); Zod-validated bodies; unit tests with mocked `fetch`
- [x] `getDataAdapter()` / `unionops-data-adapter-mode` browser preference — defaults `LocalStorageAdapter` for Comms sovereignty, opt-in `ApiAdapter` for authenticated Hub use; `docs/ARCHITECTURE.md` DataAdapter table updated
- [x] TOTP enrollment UI (`/app/mfa/setup`): `POST /api/mfa/enroll` issues a pending secret + `otpauth://` URI (QR via `qrcode`, manual fallback), `POST /api/mfa/enroll/confirm` verifies one live code before persisting — nothing is written until confirmed
- [x] `mfa-policy.ts` TOTP lookup now backend-aware (`src/lib/auth/mfa-user-secret.ts`): demo-roster override map or `users.totp_secret`/`mfa_enabled` when `AUTH_USERS_BACKEND=postgres`; `verifyMfaCode` is now async
- [x] Linked from `/app/mfa`; EN/FR copy; `docs/guides/SETUP.md` TOTP enrollment section; ROADMAP Phase 6/7 checkboxes closed

## Phase 7 — Attachment UIs + Calendar & Meetings Phase A (2026-07-23)

- [x] Grievance attachments UI — list/upload/download panel added to `GrievanceDetail` (`src/components/grievance/GrievanceDetail.tsx`) wired to the existing `GET/POST /api/grievances/[id]/attachments` + download route; base64 upload via `FileReader`; role-gated with `useStewardReadOnly`; EN/FR `grievance.attachments.*`
- [x] Bumping attachments (Phase 7 light) — `AttachmentAdapter.createForBumping` / `listForBumping` added to memory + Drizzle adapters; new `/api/bumping/cases/[id]/attachments` (list/upload) + `/[attachmentId]/download`; UI panel in `BumpingCaseDetail` gated by the existing `canWrite` prop; EN/FR `bumping.attachments.*`
- [x] `LocalMeetingSchedule` (Calendar & Meetings Phase A) — `src/lib/meetings/*` (adapter, memory + Drizzle adapters, `recurrence.ts` next-occurrence math, access, store); memory default + optional `MEETINGS_DB_BACKEND=postgres`; migration `0018_local_meeting_schedule` + RLS
- [x] Hub `/app/meetings` settings page (`MeetingScheduleSettings`) — configure monthly (by date or nth weekday) or custom-date recurrence, time/duration/location/public blurb/timezone; write gated to president/exec/admin (`canWriteMeetingSchedule`), read for any hub role; `.ics` download with optional `VALARM` reminder; copy public share link
- [x] Officer in-app reminder banner (`MeetingReminderBanner`, mounted in `[locale]/app/layout.tsx` alongside `DemoSiteBanner`) — fetches `/api/meetings/upcoming`, shows within 7 days of the next meeting; no auto-email, per `.cursor/rules/calendar-meetings.mdc`
- [x] Public "next meeting" page `/[locale]/meetings/[slug]` + reusable `NextMeetingSnippet` component, backed by public `GET /api/meetings/public/[slug]` — no login, no union/local ids, no member data
- [x] `docs/modules/CALENDAR_MEETINGS.md` Phase A marked shipped; `docs/ROADMAP.md` new Calendar & Meetings section

## FEAT-004 outcome follow-ups (2026-07-24)

- [x] Grievance detail UI — record/view arbitration/settlement outcome (`GET`/`POST /api/grievances/[id]/outcome`), steward read-only gated
- [x] Export bundle includes `outcome` + computed `appealDueDate` (JSON + PDF summary)
- [x] Optional `GrievanceStep.appealDays` (distinct from `responseDays`); reference seed Arbitration steps use `appealDays: 30`
- [x] EN/FR `grievance.outcome.*`; unit tests for appeal math + export

## R2 + case tasks + Time 8b (2026-07-24)

- [x] Calendar R2 — copy-only `membership_meeting_reminder` on Hub Events board (banner tallies already shipped)
- [x] `RelatedTasksPanel` on grievance + bumping detail (FEAT-003 case-detail follow-up)
- [x] Time 8b — sites/geofence CRUD (`/api/time/sites`), bulk approve, XLSX/PDF export rollup
