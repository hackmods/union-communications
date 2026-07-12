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
- [x] Workshop materials hub at `/guide/materials` with attendee checklist and source bibliography
- [x] `SourcesBlock` on all guides and tools; `docs/SOURCES.md` reference registry

## Solidarity Poster Maker (2026-07-11)

- [x] Cursor design brief: `.cursor/rules/solidarity-posters.mdc`
- [x] `/tools/solidarity-poster` — stack / split / banner layouts, letter + tabloid
- [x] Generic solidarity slogan presets (`SOLIDARITY_SLOGANS`)
- [x] Optional QR + support URL footer; local Brand Kit lockup when theme established
- [x] PNG/PDF export; EN/FR i18n; home boards channel + header nav

## Union Boards Guide Expansion (2026-07-11)

- [x] Bare-minimum board zones: header, socials/QR, health & safety, LEC list, events/rotating
- [x] What-to-print checklist (always / rotate / optional / sizes)
- [x] IRL-inspired reference layouts (four-quadrant, priority strip, corridor tall, steward desk)
- [x] Schematic diagrams + CTAs to board notice and solidarity poster tools
- [x] Official Ontario posters (ESA, Form 82) + e-Laws OHSA links to feed empty boards
- [x] Anonymized sample checklist / board tracker / JHSC CSV (fake names, no college PII)
- [x] Example dense-board photo for visual reference
- [x] Campus board photos (sectioned L33 + branded W010) + labeled-columns schematic

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
