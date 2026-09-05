# Progress Log

## Officer Learning colour setting (2026-09-05)

- [x] Display settings: `officerLearningColour` (`navy` default / `light` opt-in) — training pages only, not Brand Kit, not site-wide dark mode
- [x] `olThemeNavy` / `olThemeLight` + `useOlTheme()`; Sources inset follows the shell; certificate PDF stays navy
- Verify: `npm run test:unit -- src/store/preferences-store.test.ts src/lib/preferences/apply-preferences.test.ts src/lib/officer-learning/theme.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## How Canadian unions connect (2026-09-05)

- [x] New `/guide/union-history` playbook: two tracks (union family vs geographic house), Local 243 worked example, map-your-local steps
- [x] Affiliation diagrams; registry on labour / Resources / steward playbooks (not Guides mega-menu)
- [x] Sources via `comms-sources.ts` only (NUPGE map, CLC federations, NRLC, TCE)
- [x] Public copy rule: new namespaces stay off the em dash (`ZERO_EM_DASH_NS`)
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/guide-registry.test.ts src/lib/constants/comms-sources.test.ts src/lib/constants/updates.test.ts`

## Strike operations playbook (2026-09-05)

Lessons: [`docs/audit/session-knowledge-2026-09-05-strike-operations.md`](audit/session-knowledge-2026-09-05-strike-operations.md).

- [x] New `/guide/strike` — high-level operations playbook (command, line, membership, money, safety, return). Not legal advice; no posting quotas or strike-pay amounts
- [x] `/guide/crisis` stays Crisis Comms; recast quota/naming; live strike ops point at `/guide/strike`
- [x] Mega-menu Steward craft “Strike operations” → `/guide/strike` (never means crisis)
- [x] Registry: primary group bargaining; also labour resources + steward playbooks
- [x] Gold-standard pass: command roles table, two-rhythms diagram, captains' standing-brief checklist + printable PDF
- Verify: `npm run test:unit -- src/lib/comms/guide-registry.test.ts src/components/layout/nav/nav-config.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts src/lib/comms/strike-standing-brief-pdf.test.ts src/lib/export/guide-pdf-contract.test.ts`

## Public toolkit front door (2026-09-04)

- [x] Home hero + `#toolkit` chooser: Comms / steward craft / run the local (Officer Hub only when advertised)
- [x] Guides ▾: Comms (First week, Blueprint, Workshop) · Steward craft leads with playbooks hub · Resources in Libraries
- [x] Get started → `/#toolkit`; footer slimmed to product + legal (Officer Learning stays a top-level header peer)
- [x] Comms Resources no longer duplicates Workshop outline; `/tools` labour strip is one Steward playbooks link
- [x] VISION one-liner + What's new `union-toolkit-home`
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts src/components/layout/nav/nav-config.test.ts src/lib/comms/smoke-asserted-copy.test.ts`

## Export go-live QOL — logo fail-closed + download success (2026-09-05)

Companion to Office Brand Kit parity. Session note: [`docs/audit/session-knowledge-2026-09-05-pdf-office-engine-qol.md`](audit/session-knowledge-2026-09-05-pdf-office-engine-qol.md) (go-live residuals).

- [x] `requireBrandLogoBytes` / `resolveConfiguredBrandLogoBytes` + Node public-PNG disk load (Vitest/jsdom-safe)
- [x] Document Generator PPTX/ZIP fail-closed when Include logo is on
- [x] Hub minutes DOCX, election ballot DOCX, Officer Learning certificate — logo resolve errors surface with remedy
- [x] Guide/spreadsheet download buttons + Hub reports show export success (not error-only)
- [x] `common.logoResolveFailed` EN/FR + What's new `export-download-confirm`

## Office / PDF engine QOL — Brand Kit parity (2026-09-05)

Lessons + parity rules: [`docs/audit/session-knowledge-2026-09-05-pdf-office-engine-qol.md`](audit/session-knowledge-2026-09-05-pdf-office-engine-qol.md). Cursor rule: `.cursor/rules/export-engine-parity.mdc`.

- [x] Shared `office-brand-styles` for DOCX/XLSX/PPTX face resolution
- [x] Hub minutes + election ballot DOCX embed Brand Kit OFL fonts (offline Word)
- [x] Document Generator XLSX worksheets apply Brand Kit header fonts
- [x] RSVP workbook EN/FR label packs + localized validation lists
- [x] Hub board downloads use shared `downloadBlob` (mobile share / MIME)
- [x] Session knowledge + export-engine-parity cursor rule (scripts, parity rules, engine next steps)

## Canvas type-fit engine (2026-09-05)

- [x] **Root cause:** Fixed-height print canvases (`BoardNoticeLayoutCanvas` stack/band/split, Flyer stack siblings) let `CanvasTypeBlock` paint over Date/Time/Location when Brand Kit display type + lockup logo + long steward copy exceeded the slot. Mobile Preview tab made it obvious; exports shared the same layout tree.
- [x] **Engine:** `canvas-type-fit.ts` + `CanvasTypeBlock fit` + `CanvasStackSlot` — content-aware uniform shrink into bounded flex slots (any copy length, all print tools that opt in).
- [x] **Wired:** Board Notice + Flyer Maker layouts; short notice-type badges (Meeting / Bargaining / Event / Notice) so the badge no longer duplicates the headline.
- [x] **Why tests missed it:** Layout matrix only asserted preview *column* fit (`measurePreviewFit`), not internal type↔meta rect overlap. QR overlap helpers never ran on Board Notice.
- [x] **Guards:** unit tests for fit math; `measureTypeMetaOverlap` / `expectTypeMetaClear`; layout-matrix Board Notice default + long-copy cases.
- Verify: `npm run test:unit -- src/lib/utils/canvas-type-fit.test.ts src/lib/utils/canvas-layout-geometry.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

- [x] **Hub stragglers migrated:** travel / expense / time rollup PDFs → `createHubInternalReportPdfBlob`
- Verify: `npm run test:unit -- src/lib/export/pdf-layout.test.ts` + `npm run pdf:preview -- hub-travel en`

## PDF layout engine phases 0–6 (2026-09-03)

- [x] **`src/lib/export/pdf-layout/`:** extracted header/footer bands, layout modes (`flow` | `pinnedFooter` | `pinnedClosing`), `layoutWorksheet()` budget API, `buildWorksheet()` DSL, `table` / `columnLayout` / `pageBreak` primitives, golden spatial tests, `npm run pdf:preview`
- [x] **Checklist + notes headers** aligned to title → rule → subtitle contract
- Verify: `npm run test:unit -- src/lib/export/pdf-layout.test.ts` + `npm run pdf:preview -- land-acknowledgement en`

## Land Acknowledgement — worksheet PDF layout QOL (2026-09-03)

- [x] **`writeBrandedWorksheetPdf` engine:** capped fill + `closingSections`, flow-footer for short sheets, `guide-pdf-contract.test.ts` cross-family regression
- [x] **Land acknowledgement handout:** dead-zone fix (PR #58); audit confirms checklist/notes/board PDFs unchanged

## Land Acknowledgement — discoverability pass (2026-09-02)

- [x] **SEO + catalog blurbs:** solo path, workshop, PDF worksheet in meta descriptions and steward playbook listings (EN/FR)
- [x] **PDF smoke:** land acknowledgement worksheet in `guide-pdf.export.smoke.spec.ts`
- Verify: `npm run test:unit -- src/lib/seo/public-page-meta.test.ts src/lib/comms/public-copy-style.test.ts` + guide PDF smoke

## Land Acknowledgement — solo + workshop paths (2026-09-02)

- [x] **How to write:** replaced four-person framing with solo flow (~45 min) + facilitator workshop agenda (~60–90 min) on same page
- [x] **Worksheet PDF:** dual-path handout (solo or group); no fixed head count
- [x] **Removed:** four role cards — pairs/small groups in workshop instead
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/comms/land-acknowledgement-worksheet-pdf.test.ts` + land acknowledgement smoke

## Land Acknowledgement — refactor + worksheet (2026-09-02)

- [x] **Guide IA:** 14 sections → 8 (ground rules, why/principles, how to write, prepare, at meeting, federations, go further, next steps)
- [x] **Visual:** solo flow diagram + branded PDF worksheet (`land-acknowledgement-worksheet-pdf.ts`)
- [x] **Deduped:** tokenism, OPSEU order, research tools, action/next-steps overlap
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/comms/land-acknowledgement-worksheet-pdf.test.ts` + land acknowledgement smoke

## Land Acknowledgement — annotated worked example (2026-09-02)

- [x] **Guide:** `/guide/land-acknowledgement` — Niagara-region teaching example with three annotated blocks (territory, action, covenant); no copy button
- [x] **What's new:** updated land-acknowledgement-guide note
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts` + land acknowledgement smoke case

## Land Acknowledgement Guide — cross-links + smoke (2026-09-02)

- [x] **Guide:** `/guide/land-acknowledgement` — educational playbook (no generator); OPSEU / SEFPO, OFL, CUPE, BCGEU federation practice; federation sources in `comms-sources.ts`
- [x] **Cross-links:** running-meetings agenda callout + related link; Officer Learning democratic-governance module; land ack ↔ running meetings reciprocity
- [x] **Discoverability:** guide registry (labour, steward playbooks, Resources), footer, sitemap, SEO EN/FR, What's new
- [x] **Smoke:** `steward-tools.smoke` + `builders.smoke` H1 matrix for land acknowledgement route
- Verify: `npm run test:unit -- src/lib/comms/guide-registry.test.ts src/lib/officer-learning/related-resources.test.ts src/lib/comms/public-copy-style.test.ts src/lib/constants/comms-sources.test.ts src/lib/constants/updates.test.ts src/lib/seo/public-page-meta.test.ts`

## Document Generator links + deeplink hardening (2026-08-31)

- [x] **Deeplink fix (#42):** static-import preview; initialize `?preset=` on first render; tool-scoped error panel with refresh guidance
- [x] **Link cleanup:** `documentGeneratorPresetHref()` + `resolveOfficePresetFromQuery()` — trailing-slash-safe CTAs across steward/grievance guides and Officer Learning related resources
- [x] **Smoke:** steward-101 → grievance intake worksheet navigation guarded in `builders.smoke`
- Verify: `npm run test:unit -- src/lib/constants/document-generator-links.test.ts` + `npm run test:smoke` (document generator deeplink case)

## Union Boards reference materials — registry + PDF/XLSX (2026-08-31)

- [x] **Registry:** Ontario rights sources (`ontario-ohsa-guide`, `ontario-esa-guide`, `ohrc-code-rights`, `ontario-ohrc-statute`, `wsib-ontario`); website ZIP Rights & Partners footer via `getWebsiteRightsPartnersOntarioSources()`; board materials + QR presets use `commsSourceUrl()`
- [x] **Guide exports:** branded PDF checklists (`board-reference-pdf.ts`) replace raw `.md` demos; CSV→XLSX on Union Boards, Steward 101 intake, and Workplace Mapping templates
- [x] **Steward worksheets:** PDF export is now the primary button in workspace export bars
- [x] **What's new:** `/updates` union-boards-pdf-templates note
- Verify: `npm run test:unit -- src/lib/constants/comms-sources.test.ts src/lib/constants/board-materials.test.ts src/lib/comms/board-reference-pdf.test.ts src/lib/comms/csv-to-xlsx.test.ts src/lib/templates/website/generate-website-zip.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## Bylaw Builder QOL + committee draft (2026-08-31)

- [x] **Committee draft mode:** per-article editing, committee notes, OPSEU / SEFPO article set, redline summary when pasting current bylaws
- [x] **Presets:** `opseuCaat` college sample (Local 243 patterns); Brand Kit local number in preset apply
- [x] **Guide:** OPSEU / SEFPO college patterns section, committee workspace, scenario + CTAs (`?preset=opseuCaat`, `?mode=committee`)
- [x] **Portal:** Circle bulletin callout linking writable users to committee builder
- [x] **Sources:** `opseu-forms` hub note expanded for constitution + bylaws checks
- [x] **What's new:** `/updates` bylaw-builder-committee note
- Verify: `npm run test:unit -- src/lib/bylaws/ src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts`


## Post-ship QOL — smoke matrix + agent ground truth (2026-08-28)

- [x] `builders.smoke` H1 matrix: running-meetings, seniority-bumping, right-to-refuse
- [x] `current-ground-truth.md` + `roadmap-next.mdc` — running meetings, OL nav, guide registry
- [x] Smoke fixes: `flyerMaker.fonts.lato` EN/FR; `rightToRefuseGuide.boards.navLabel`; pulse-poll gate test; Playwright `NEXT_PUBLIC_OFFICER_HUB_PUBLIC` default; steward-tools duplicate-link locators

## Running meetings & Rules of Order — gold-standard pass (2026-08-28)

- [x] **Guide depth:** `/guide/running-meetings` — quorum + `QuorumTiersDiagram`, motion precedence + `MotionPrecedenceDiagram`, debate, voting, failures, worked GMM scenario, pocket PDF CTA
- [x] **Cheat sheet:** `/tools/rules-of-order` — 14 actions (motions/points/meeting), filter chips, search, sticky card, copy phrase, chair notes + hints
- [x] **Cross-links:** OL module 4 related resources, steward playbooks workspace, [`session-knowledge-2026-08-28-running-meetings-rules-of-order.md`](audit/session-knowledge-2026-08-28-running-meetings-rules-of-order.md)
- Verify: `npm run test:unit -- src/lib/rules-of-order/actions.test.ts src/lib/comms/public-copy-style.test.ts`

- [x] **Guide registry:** `guide-registry.ts` — single discoverability source for Blueprint, Resources, steward-playbooks; coverage test vs `PUBLIC_PATHS`
- [x] Session knowledge: [`session-knowledge-2026-08-28-officer-learning-nav-guides.md`](audit/session-knowledge-2026-08-28-officer-learning-nav-guides.md)
- Verify: `npm run test:unit -- src/lib/comms/guide-registry.test.ts`

## Officer Learning olTheme sweep — quiz, content, PDF (2026-08-28)

- [x] Extended `olTheme` tokens; migrated ModuleQuiz, ModuleContentRenderer, checklists, diagrams, timelines, worked scenarios, sync panel, certificates
- [x] GuideToc dark variant → platform orange; certificate PDF palette → brand orange
- Verify: `npm run lint` + OL/smoke as needed

## Officer Learning chrome + nav IA refresh (2026-08-27)

- [x] **OL theme:** `olTheme` tokens — navy focus shell kept; amber/teal replaced with platform orange
- [x] **Nav:** Guides → five groups (channels before steward training); OL featured card + first in Steward training; Tools **Steward worksheets** rename
- [x] Mobile drawer OL featured card; `comms-public-nav.mdc` + `COMMS.md` updated
- Verify: `npm run test:unit -- src/components/layout/nav/nav-config.test.ts`

## Public page QOL pass — full PUBLIC_PATHS review (2026-08-27)

- [x] **UI-018 extended:** `GuideToolAside` on remaining playbook guides (steward-101, bylaws, bargaining, website, crisis, joint-committee, photo-consent, workplace-mapping, dfr, social-media-plan, workshop, steward-playbooks)
- [x] Onboarding EN/FR `subtitle` on focus page
- [x] Audit [`public-page-qol-pass-2026-08-27.md`](audit/public-page-qol-pass-2026-08-27.md)
- [x] `guideCommon` in copy guard namespaces
- Verify: `npm run lint` + copy/update/guide-toc unit tests

## Public polish — tool asides, copy, cross-links (2026-08-27)

- [x] **UI-018:** `GuideToolAside` on eight playbook guides; `guideCommon` EN/FR
- [x] Copy polish: examples, assets, captions, tools index, print + email intros (COPY-006 partial)
- [x] Grievance guide → shared `guideCtaClasses`; examples ↔ captions cross-links
- [x] What's new `guide-tool-aside`
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts`

## UX uplift Phases A–C — guides, tools catalog, public pages (2026-08-27)

- [x] **UI-012–015:** Remaining guides on playbook/hub presets — labour playbooks, gold facilitators, channel guides, resources hub grids, `/guide` index sidebar TOC, union-boards
- [x] **UI-009:** `/tools` on `ComposedPageLayout`; mobile Start-here `<details>`; xl+ labour playbook strip
- [x] **UI-017:** Tool shell regression sweep — parity holds
- [x] **UI-019–020:** Examples filter rail @ lg+; assets/captions wide composition; focus pages verified
- [x] Audit + execution-backlog UI-009, UI-012–015, UI-017, UI-019–020 closed
- Verify: `npm run test:unit -- src/lib/comms/guide-toc-items.test.ts src/lib/constants/page-composition.test.ts src/lib/comms/public-copy-style.test.ts`

## UX uplift — flexible guide layout + space audit (2026-08-27)

- [x] **UI-007:** Master audit [`public-space-composition-audit-2026-08.md`](audit/public-space-composition-audit-2026-08.md) + four-width matrix guides/hub/portal sections
- [x] **UI-008:** `readWide` shell, `page-composition.ts`, `ComposedPageLayout`, `GuideLayout` presets (`narrow` | `playbook` | `hub`); playbook tier TOC @ lg+; default `narrow` for channel/legal
- [x] **UI-010:** Hub `@mobile` overflow extended; `e2e/portal.mobile.spec.ts`
- [x] **UI-011:** `ModuleToc` → shared `GuideToc` (dark variant)
- [x] What's new `guide-playbook-layout`; execution-backlog UI-007–011 + COPY-006
- Verify: `npm run test:unit -- src/lib/constants/page-composition.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## Office DOCX B2 + B3 — worksheet Word + OOXML font embed (2026-08-27)

- [x] **B3:** `ooxml-font-embed.ts` — obfuscated TTF parts in DOCX/PPTX + OFL `NOTICE.txt`; wired through `renderDocxFromPreset` / `renderPptx`; `collectOfficeEmbedTtfFiles` in `canvas-fonts.ts`
- [x] **B2:** Word presets for `seniority-worksheet` and `grievance-intake` (`buildSeniorityWorksheetDocx`, `buildGrievanceIntakeDocx`); Document Generator UI + EN/FR structure keys
- [x] Unit tests: `ooxml-font-embed.test.ts`, extended `office-export.test.ts`; What's new `office-worksheet-docx`
- [x] Future engines doc + parked followups updated (B2/B3 shipped; OOXML embed lifted from non-goals)
- Verify: `npm run test:unit -- src/lib/export/ooxml-font-embed.test.ts src/lib/export/office-export.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## Hub DOCX Brand Kit parity — Project B1 (2026-08-27)

- [x] Minutes + election ballot DOCX: Brand Kit headline/body font names, primary colour on title, optional PNG logo, EN/FR fixed labels
- [x] Wired `MinutesDetail` (client Brand Kit) and ballot API route (server `DEFAULT_BRAND_KIT`)
- [x] Unit tests: `export-docx.test.ts`, `export-ballot.test.ts`; What's new `hub-docx-brand-kit` (hub audience)
- [x] Engines doc: B1 checklist marked done; legacy docxtemplater remains samples/tests
- Verify: `npm run test:unit -- src/lib/minutes/export-docx.test.ts src/lib/elections/export-ballot.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## Future goal note — PDF + Word engines (2026-08-27)

- [x] Parked review: Brand Kit typefaces stay out of text PDFs (Helvetica + mark PNG); full checklist for a text-PDF engine + Word/doc expansion in `docs/audit/future-pdf-and-docx-engines-2026-08.md`
- [x] Cross-links from `guide-pdf-quality-2026-08.md`, `guide-pdfs.mdc`, `plan-2026-08-15-parked-followups.md`

## Logo visibility on brand fills (2026-08-27)

- [x] Root cause: multi-colour lockups (CAAT-S coral+gold) used the colour asset on non-primary bands; gold glyphs vanished on gold fills
- [x] Durable fix (not CSS outline): identity `lockupForCanvasBackground` by canvas hex; **custom uploads** get a paper safe plate (QR-style) preserving full colour; Office `brand-logo-bytes` composites the plate
- [x] Shared path: `resolveBrandLogoPresentation` → `BrandLogo` + export embeds
- [x] Tests + What's new `logo-on-brand-fills`; rules: `meeting-backgrounds.mdc`, `comms-module.mdc`
- Verify: `npm run test:unit -- src/lib/brand/resolve-logo-presentation.test.ts src/lib/brand/identity-packs.test.ts src/lib/export/brand-logo-bytes.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## Guide / training PDF branding (2026-08-27)

- [x] Inventory + quality bar: `docs/audit/guide-pdf-quality-2026-08.md`
- [x] Agent rule: `.cursor/rules/guide-pdfs.mdc`
- [x] Shared chrome: `src/lib/export/text-pdf-layout.ts` (UnionOps interlock mark + education footer)
- [x] Wired `reference-pdf.ts`, `certificate.ts`, `steward-guides/export.ts`
- [x] Unit + `e2e/guide-pdf.export.smoke.spec.ts`; What's new `guide-pdf-branding`
- Verify: `npm run test:unit -- src/lib/export/text-pdf-layout.test.ts src/lib/officer-learning/certificate.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`; smoke `e2e/guide-pdf.export.smoke.spec.ts`

## Guides & Tools menu IA (2026-08-27)

- [x] Guides mega-menu hub-first: Start here / Steward work / By channel / Libraries & about — topic playbooks stay on `/guide/steward-playbooks`
- [x] Tools keep five job groups; mega-menu + `/tools` grid 2 → 3 → 5 columns (`flyout-geometry`)
- [x] Synced `comms-public-nav.mdc` + `COMMS.md`; What's new `guides-tools-menu-ia`
- Verify: `npm run test:unit -- src/components/layout/nav/nav-config.test.ts src/lib/utils/flyout-geometry.test.ts src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts`

## Labour guide chrome + CI smoke (2026-08-27)

- [x] Steward playbooks: unique Officer Learning CTA label; shared `guideCtaClasses` (no `Link>Button`)
- [x] Bargaining / bylaws / steward-101 / DFR: CTA de-dupe + shared chrome; bylaws relatedLinks capped; redundant sourcesNote removed
- [x] `PUBLIC_NS` + copy-guard fixes for bargaining / officer-learning; thin H1 smoke for bylaws + bargaining
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts`; smoke `e2e/officer-learning.smoke.spec.ts`

## Labour guides next pass (2026-08-27)

- [x] Officer Learning: GuideLayout-style related/Sources placement on dark shell; unique path vs card link names; sticky vs related playbooks labels; drop duplicate playbooks chips from module related resources
- [x] Remaining public guide `Link>Button` → `guideCtaClasses` (+ Sm/Ghost variants)
- [x] Thin H1 + axe for `/guide/dfr`; builders H1 matrix includes dfr + steward-playbooks; officer-learning smoke without `.first()` papering
- [x] Session knowledge: `docs/audit/session-knowledge-2026-08-27-labour-guides-chrome.md`
- Verify: `npm run test:unit -- src/lib/officer-learning/related-resources.test.ts src/lib/comms/public-copy-style.test.ts`; smoke `e2e/officer-learning.smoke.spec.ts`

## Bargaining lifecycle gold polish (2026-08-27)

- [x] Failure modes, strike-vote/ratification mechanics, national TA clearance, CCBA dispute callout, deeper related links

## Bargaining lifecycle guide depth (2026-08-27)

- [x] Definitive playbook pass: LRA/CCBA gate, lifecycle + No Board diagrams, blackout vs updates, tracker how-to, checklist, worked timeline, tools, Ontario.ca sources
- [x] Cross-links from crisis, joint committee, Officer Learning module 6

## Bargaining lifecycle guide + Proposal Tracker (2026-08-27)

- [x] Public `/guide/bargaining` — survey → table → dispute/strike vote → ratification; Blueprint "Bargaining & Strikes" strip; Resources / Steward playbooks / nav
- [x] Local-first `/tools/proposal-tracker` — spreadsheet rows, status dropdown, CSV export, on-device draft via `saveJsonDraft`
- [x] What's new notes + SEO/sitemap registration

## Local bylaws definitive guide (2026-08-27)

- [x] Diagrams: document hierarchy, amendment flow, quorum tiers (public light-theme)
- [x] Worked GMM scenario table (When / Action / Artifact) + campus Builder deep-link
- [x] Reference grid: adoption checklist PDF, quorum & motion PDF, Builder, Module 4
- [x] Rich checklist rows; Builder `?preset=` hydrate + adoption checklist prompt
- Verify: `npm run test:unit -- src/lib/bylaws/build-template.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts src/lib/constants/comms-sources.test.ts`

## Local bylaws guide + Bylaw Builder QOL (2026-08-27)

- [x] `/guide/bylaws` raised to playbook depth: constitution gate, expanded must-haves, amendment CTAs, worked GMM timeline, checklist, peer examples (CUPE / Unifor / OPSEU / SEFPO), failure modes, tools section
- [x] On-topic sources: `cupe-bylaws-guide`, `cupe-constitution`, `unifor-constitution`, `opseu-constitution` wired to guide + builder
- [x] Bylaw Builder: sample size presets, draft persistence, signing/trustees/meetings/elections/notice fields, 13-article template, Markdown/PDF/print/TXT/copy exports, Sources footer
- Verify: `npm run lint`; `npm run test:unit -- src/lib/bylaws/build-template.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/comms-sources.test.ts`

## Local bylaws guide + Bylaw Builder (2026-08-27)

- [x] Public `/guide/bylaws` — what must be in local bylaws, amendment steps, Bylaw Builder CTA; Blueprint / Resources / Steward playbooks / nav registration
- [x] Public `/tools/bylaw-builder` — local-first form + live template preview, copy + `.TXT` download, steward-prep catalog
- [x] Sources, SEO, sitemap, What's new (`local-bylaws-guide`, `local-bylaws-builder`), Officer Learning governance cross-links
- Verify: `npm run lint`; `npm run test:unit -- src/lib/bylaws/build-template.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/app/sitemap.test.ts src/lib/constants/comms-sources.test.ts`

## Grievance playbook + intake worksheet (2026-08-26)

- [x] Public `/guide/grievance-process` rewritten as a how-to-run-a-file playbook: forum gate, teaching 6 W's, clocks, CA-named jobs (not a universal 3-step map), meeting, worked file, failure modes, single disclaimer
- [x] Document Generator preset `grievance-intake` (Excel 6 W's worksheet, empty defaults) with CTA from the investigation section
- [x] Steward 101 go-deeper points here first; What's new `grievance-process-guide` updated in place; sources stay CA finder + CCBA + LRA, DFR as sibling
- [x] Hub 6 W's on New Grievance named as next module only (`docs/modules/GRIEVANCE.md`) — not built this pass
- [x] Definitive-guide QOL: forum flow figure, example FT/PT step table, member-talk section, open-file checklist, dedicated worksheet + tools sections; Document Generator related link back to guide
- Verify: `npm run lint`; `npm run test:unit -- src/lib/constants/office-templates.test.ts src/lib/export/office-export.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts`

## Workplace mapping guide (2026-08-26)

- [x] Public `/guide/workplace-mapping` — physical map, organic leaders, 1-to-5 support scale, privacy callouts, downloadable CSV template
- [x] Definitive-guide QOL: when/who gate, DFR not-a-hit-list warning, shift / social / scale diagrams, 1-on-1s, fictional Student Services table + example CSV, keep-the-map, Org Chart vs scores
- [x] Linked from The Blueprint labour strip + related paths, Comms Resources labour playbooks, Steward 101 and membership signup related links
- [x] Sitemap, EN/FR SEO, federation sources, What's new `workplace-mapping-guide` (same-day body update)
- Verify: `npm run lint`; `npm run test:unit -- src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/templates/workplace-map-template.test.ts`

## Steward's Guide to Grievances (2026-08-26)

- [x] Public `/guide/grievance-process` — 6 W's intake, informal / written / arbitration steps, deadline and equal-footing callouts, Officer Hub CTA
- [x] Linked from The Blueprint labour strip + related paths, Comms Resources labour playbooks, DFR / seniority / right-to-refuse / joint-committee related links
- [x] Sitemap, EN/FR SEO, sources (CA finder + CCBA + LRA), What's new `grievance-process-guide`
- Verify: `npm run test:unit -- src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/app/sitemap.test.ts src/lib/constants/comms-sources.test.ts`

## CapRover BuildKit / slim db-migrate (2026-08-25)

- [x] Root cause: CapRover `unknown parent image ID` on `COPY --from=migrate … node_modules` (large cross-stage export on small hosts)
- [x] `docker/migrate-package.json` + runner-stage `npm install` (~59MB); no cross-stage migrate `node_modules` COPY
- [x] CI `docker-image` job publishes GHCR independently of E2E; prefer image pull over git rebuild
- [x] Session knowledge + [`.cursor/rules/caprover-docker.mdc`](../.cursor/rules/caprover-docker.mdc)
- Verify: `https://unionops.org/api/health` → commit `f3f04c6…`; `bash scripts/docker-migrate-smoke.sh`

## Brand Assets PWA downloads (2026-08-24)

- [x] Brand Assets logo downloads use `downloadHrefAsFile` (fetch + `saveBlob`) instead of `<a download>` navigation that ejects installed / home-screen apps
- [x] `saveBlob` skips iOS `window.open` blob tab when `display-mode: standalone` / `navigator.standalone`
- [x] What's new: `assets-pwa-download`
- Verify: `npm run test:unit -- src/lib/export/save-blob.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## Live compliance hardening runbook (2026-08-24)

- [x] [`docs/guides/COMPLIANCE_HARDENING_LIVE.md`](guides/COMPLIANCE_HARDENING_LIVE.md) — phased CapRover Postgres flip + MFA + demo-off checklist for unionops.org
- [x] Session knowledge [`session-knowledge-2026-08-24-portal-security-hardening.md`](audit/session-knowledge-2026-08-24-portal-security-hardening.md)
- **Next (ops):** execute runbook Phases 0–3; Portal stays evaluation until `PORTAL-DB-001`

## Portal security audit + hosted security page (2026-08-24)

- [x] Evidence audit [`portal-encryption-security-audit-2026-08-24.md`](audit/portal-encryption-security-audit-2026-08-24.md) — explicit **no encryption at rest** verdict for Portal
- [x] IDOR fixes in `memory-adapter.ts`; `portalJson` `Cache-Control: private, no-store`; sidebar roster validation; `activity_pack` admin gate
- [x] Unit tests `portal-idor.test.ts` (7 cases); security-review pass on diff
- [x] Operator guide [`HOSTED_SECURITY.md`](guides/HOSTED_SECURITY.md); public `/security` EN/FR; footer + sitemap
- Verify: `npm run test:unit -- src/lib/portal/portal-idor.test.ts src/lib/auth/api-route-auth.test.ts`

## Production migrate in Docker image (2026-08-24; slimmed 2026-08-25)

- [x] Ship SQL journal + `drizzle-kit` in `/app/db-migrate/` (entrypoint auto-migrate)
- [x] `drizzle.migrate.config.ts` — migrate-only config (no schema TS in runner)
- [x] `docker/entrypoint.sh` — explicit drizzle-kit path, fail-fast migrate, `sync-app-role-password.mjs`
- [x] `scripts/docker-migrate-smoke.sh` + CI — prove entrypoint applies migrations
- [x] `scripts/caprover-bootstrap-seed.sh` — one-shot seed on CapRover network
- [x] `docker/.env.production.example` + [`docs/guides/CAPROVER_POSTGRES.md`](guides/CAPROVER_POSTGRES.md)
- [x] **2026-08-25:** drop separate migrate stage / cross-stage `node_modules` COPY; use [`docker/migrate-package.json`](../docker/migrate-package.json) in runner (BuildKit export fix)

## Hub copy sequel (2026-08-24) — COPY-003

- [x] Time 8c–8f + QOL handoff/calendar/snippets/marketplace error strings — EN/FR remedy clauses (refresh, check fields, try again)
- [x] Site feedback / Portal feedback — “steward” → **operator** (product mail, not local steward)
- [x] Hub guard: `*Error` keys in `HUB_NS` must include a remedy clause
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts`

## Graphic gradient ink (2026-08-24)

- Solidarity / spotlight / thanks / results full-bleed fields use `brandFieldFillStyle` (same-hue primary deepen) instead of primary→white/accent washes that muddy midtones.
- Bottom lift shortened via `brandFieldBottomLiftStyle`; type ink still samples `#1A1A1A`.
- What's new: `graphic-gradient-ink`.

## Federation sources QOL (2026-08-24)

- Registered universal `nupge` + `clc` beside `ofl` in `comms-sources.ts`; website ZIP Rights & Partners federations resolve via `getWebsiteRightsPartnersFederationSources()`.
- Wired OFL/NUPGE/CLC onto Blueprint, union boards, crisis, and membership signup SourcesBlocks; short federations callout on `/guide/resources`.
- What's new: `federation-sources`.

## Demo login sample accounts (2026-08-23)

- [x] Officer login shows a Sample accounts Callout when the demo roster can sign in, with every seed role, shared password, and tap-to-fill — replaces the one-liner under Forgot password
- [x] Form first; sample accounts sit beside it from `md` (`nestedFocus`) and in a compact two-column grid on phones
- Verify: `npm run test:unit -- src/lib/auth/demo-users.test.ts src/lib/comms/public-copy-style.test.ts`; smoke: `npx playwright test e2e/smoke.spec.ts --grep "sample accounts"`

## Demo login domain (2026-08-23)

- [x] Demo roster emails use reserved RFC 2606 `unionops.test` (`DEMO_EMAIL_DOMAIN`) so they cannot collide with a real union or local mailbox
- [x] Login hint, README, e2e helpers, officer seed roster, and Hub docs updated
- Verify: `npm run test:unit -- src/lib/auth/demo-users.test.ts src/lib/auth/sec007.test.ts src/lib/comms/public-copy-style.test.ts`

## Joint-committee demo roster (2026-08-23)

- [x] Demo `eerc.145@unionops.test` (Local 145, PT) plus Local 415 president; tenant locals 145 / 415
- [x] Seeded union-scoped Portal Circle `circle-caucus-joint` with Floor, Sidebars, Bulletin, and Actions from four locals
- [x] Login hint lists the joint-committee caucus account
- Verify: `npm run test:unit -- src/lib/portal/portal.test.ts src/lib/portal/circle-invitees.test.ts src/lib/tenant/loader.test.ts src/lib/tenant/tenant.test.ts src/lib/comms/public-copy-style.test.ts`

## Joint committee playbook + union-scoped Circles (2026-08-23)

- [x] Public `/guide/joint-committee` — campus → provincial table → member explainer after signed minutes; OPSEU / SEFPO EERC as example only
- [x] Registry: `opseu-eerc-minutes`, `cec-pteerc-minutes`; What's new `joint-committee-guide`
- [x] Local Portal: create Circle with members from more than one local (`scope: "union"` omits `localId`); Roster invite is union-wide; demo Local 560 president
- [x] Hub `/app/committees` points at the playbook so a provincial table is not filed on the local roster
- [x] What's new `portal-union-circles` (Hub audience until Officer Hub is advertised)
- Verify: `npm run test:unit -- src/lib/portal/circle-create.test.ts src/lib/portal/circle-invitees.test.ts src/lib/portal/portal.test.ts src/lib/constants/updates.test.ts src/lib/constants/comms-sources.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/app/sitemap.test.ts`

## Joint committees / EERC fit-gap (2026-08-23)

- [x] Mapping only: PT/FT EERC is a provincial joint body; Hub org modules are local-scoped
- [x] Session knowledge + ground truth — no Home CTA, no OPSEU-named module
- [x] Usable today: public Comms (letterhead / flyers / email-broadcast) + local UCC; see playbook + union-scoped Circles above
- Verify: `git ls-files docs/audit/session-knowledge-2026-08-23-eerc-committees.md`

## Membership audience by sector (2026-08-23)

- [x] Brand Kit Audience (Full-time / Part-time) only for College Support; other sectors and unions keep All members and hide the dropdown
- Verify: `npm run test:unit -- src/lib/brand/membership-primary.test.ts src/components/brand/MembershipUrlsEditor.test.tsx src/lib/comms/public-copy-style.test.ts`; smoke: `npx playwright test e2e/brand-kit.layout.smoke.spec.ts --grep "membership audience"`

## OPSEU bibliography URL refresh (2026-08-23)

- [x] `opseu-contact` → `https://opseu.org/contact-us/` (retired `/contact/`)
- [x] `opseu-collective-agreements` → Find Your Collective Agreement (retired `/bargaining/collective-agreements-and-arbitration-awards/`)
- [x] `opseu-forms` → Members tools hub (retired guessed `/about-opseu-sefpo/forms-documents/`)
- [x] Home + Member Portal still current; `hub03` EMA join links kept pending steward confirm
- Verify: `npm run test:unit -- src/lib/constants/comms-sources.test.ts src/lib/templates/website/generate-website-zip.test.ts`

## Org Chart list + campus layouts (2026-08-23)

- [x] Layouts: **Poster** | **List** (Position | Name) | **List + location** (campus / site codes)
- [x] Campus-oriented location field (short-code placeholder); location column only on List + location
- Verify: `npm run test:unit -- src/lib/constants/org-chart-formats.test.ts src/lib/org-chart/layout.test.ts src/lib/comms/public-copy-style.test.ts`

## Org Chart QOL + LEC Doc Gen template (2026-08-23)

- [x] Org Chart: `poster` | `directory` layout; letter/tabloid landscape sizes; directory canvas Position | Name | Location
- [x] Org Chart editor: group sections, slim Name|Role|Location rows, More options (unit FT/PT, reports-to, website)
- [x] Document Generator: standalone `lec-directory` preset (DOCX + XLSX) — Brand Kit chrome + placeholder rows only; **no** PublicRoster / Hub pull
- [x] Related tools Org Chart ↔ Doc Gen; What's new `org-chart-directory`; EN/FR + session knowledge
- Verify: `npm run test:unit -- src/lib/constants/org-chart-formats.test.ts src/lib/org-chart/layout.test.ts src/lib/constants/office-templates.test.ts src/lib/export/office-docx-builders.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## Brand Kit Look gallery plates (2026-08-24)

- [x] CAAT-S coral and gold appear as peer Look-gallery cards (one click); nested campaign-plate radios removed as primary path
- [x] Named plate records on `opseu-caat-s` (`coral` / `gold`) with explicit colours + lockup — no primary↔accent invert
- [x] Legacy saved `primary` / `accent` coerce to `coral` / `gold` on hydrate
- [x] What's new `caat-s-gold-plate` updated; rule: new brand systems → Look rows; field treatments → gallery tiles from plates
- Verify: `npm run test:unit -- src/lib/brand/identity-packs.test.ts src/lib/brand/resolve-logo-presentation.test.ts src/lib/utils/local-links.test.ts src/components/brand/IdentityPackPicker.test.tsx src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## CAAT-S president feedback (2026-08-23)

- [x] CAAT-S SVG downloads use a shared 174×97 artboard; coral and gold plates cover the full viewBox
- [x] `opseu-branding` → `https://opseu.org/about-opseu-sefpo/` (bare `/about/` landed on OCOT); `/assets` keeps a single SourcesBlock citation
- [x] College Support Look offers coral or gold campaign plate in Brand Kit (gold swaps primary/accent and uses the on-gold lockup)
- [x] Reverse lockup download (`caat-s-bilingual-06-reverse.svg`) includes the official black plate so the white wordmark is visible
- Verify: `npm run test:unit -- src/lib/brand/identity-packs.test.ts src/lib/brand/resolve-logo-presentation.test.ts src/lib/constants/comms-sources.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts src/components/brand/IdentityPackPicker.test.tsx`

## Brand Kit CAAT-S Look mobile overflow (2026-08-23)

- [x] Look gallery cards no longer size to max-content of the long CAAT-S description — width-capped + wrapping copy, `min-w-0` on Card / Brand Kit grid
- [x] Wide bilingual lockup clipped in header chrome; coral plate and logos stay inside the card on phones
- [x] Unit + smoke coverage at phone / tablet / desktop for OPSEU + College Support Look
- Verify: `npm run test:unit -- src/components/brand/IdentityPackPicker.test.tsx src/components/ui/primitives.test.tsx src/app/globals-overflow.test.ts`; `npx playwright test e2e/brand-kit.layout.smoke.spec.ts`

## Brand Kit identity packs / CAAT-S Look (2026-08-21)

- [x] Data-driven identity packs (`identity-packs.ts`): OPSEU national blue default + CAAT-S coral Look for College Support
- [x] Look gallery on Brand Kit + onboarding; LogoSettings variants from active pack; reverse lockup on coral plates
- [x] Real SVG assets under `public/assets/caat-s/` from bilingual-01…06; `assetVariants` catalog for downloads
- [x] `/assets` lists every Look pack file (colour / plate treatments) for OPSEU + CAAT-S — reusable shape for future campaign packs
- [x] Chrome tokens: `--opseu-dark` / `--opseu-blue` stay readable on white UI even when Brand Kit accent is light gold; canvas ink prefers white on saturated coral
- [x] What's new `caat-s-look`; collections stay text-only
- Verify: `npm run test:unit -- src/lib/brand/chrome-tokens.test.ts src/lib/brand/identity-packs.test.ts src/lib/utils/utils.test.ts`

## Org Chart (2026-08-20)

- [x] Public `/tools/org-chart`: officers and stewards editor, letter/tabloid who-to-contact poster (PNG + PDF), on-device JSON/CSV round-trip
- [x] Shared `PublicRoster` hydrates Website Template (`showOnWebsite`); sanity cap 24; no Hub roster pull, no photos, no member lists
- [x] Nav Union boards; What's new `org-chart`; EN **Org Chart** / FR **Organigramme**
- Verify: `npm run test:unit -- src/lib/org-chart/org-chart.test.ts src/lib/data/local-storage-adapter.roster.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/components/layout/nav/nav-config.test.ts`

## CAAT-S Brand Kit collection (2026-08-20)

- [x] College Support (CAAT-S) starter is one **College Support** identity + Other — FT/PT members share the same locals
- [x] Membership still lists Full-Time and Part-Time join links; legacy FT/PT profile ids still select the matching primary
- [x] What's new: `caat-support-collection` on `/updates`
- Verify: `npm run test:unit -- src/lib/brand/catalog-completeness.test.ts src/lib/brand/collection-profiles.test.ts src/lib/brand/opseu-sector-catalog.test.ts src/lib/brand/membership-primary.test.ts src/lib/constants/unionPresets.test.ts src/lib/utils/local-links.test.ts src/lib/data/local-storage-adapter.test.ts src/lib/templates/website/brand-kit-fields.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## Website Template config round-trip (2026-08-20)

- [x] Both site ZIPs include `unionops-website.json` (GitHub Pages root; WordPress theme folder)
- [x] Import JSON or the ZIP on `/tools/website-template` restores copy/officers/hero as a session overlay — does not write Brand Kit
- [x] Standalone site-file download; Website Guide “How to edit” + What’s new `website-config-roundtrip`
- Verify: `npm run test:unit -- src/lib/templates/website src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts`

## OPSEU / SEFPO lockup (2026-08-20)

- [x] Volunteer-facing copy, Brand Kit union picker, reference tenant name, membership label, and bibliography rows use **OPSEU / SEFPO** (spaces around the slash)
- [x] Preset id, tenant slug, and code paths stay `opseu`
- [x] Copy guard in `public-copy-style.test.ts` rejects a bare OPSEU/SEFPO
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/comms/smoke-asserted-copy.test.ts src/lib/constants/unionPresets.test.ts src/lib/constants/comms-sources.test.ts src/lib/templates/website/brand-kit-fields.test.ts src/lib/tenant/tenant.test.ts src/lib/brand/collection-profiles.test.ts src/lib/brand/membership-primary.test.ts`

## President soft launch (2026-08-19)

- [x] Durable tenant writes: `create_local` / `create_collection` / `create_union` persist to Postgres when `DATABASE_URL` is set; overlay hydrates on Hub/Portal request
- [x] Operator **Invite a local president** (find-or-create local number + email); pending invite list; local picker for elevated roles
- [x] Server-side invite ladder + `local_member` email invites (members land on Local Portal)
- [x] Union setup checklist: local, Brand Kit, Hall, invites; early-access Hub/Portal banner while Hub is unadvertised
- [x] `ensureHall` + auto-join on Together, invite accept, and `/api/portal/hall/ensure` (Bulletin/Floor stay memory)
- [x] Soft-launch QOL: session local (not 243) on Hub chrome; president first-run `?next=/app/onboarding` + dashboard setup card; pending copy/resend; Hall roster rebuild from users
- Verify: `npm run test:unit -- src/lib/tenant/access.test.ts src/lib/tenant/persist.test.ts src/lib/tenant/overlay.test.ts src/lib/tenant/loader.test.ts src/lib/auth/invites.test.ts src/lib/auth/post-login-path.test.ts src/lib/email/messages.test.ts src/lib/portal/portal.test.ts src/lib/portal/hall-roster.test.ts src/lib/comms/public-copy-style.test.ts`

## Local Portal solidarity names (2026-08-19)

- [x] Steward-facing Portal labels: **Together** / **Hold the line** / **One fight** / **Many hands** (FR Ensemble / Tenir la ligne / Un seul combat / Plusieurs mains). Routes and ids unchanged
- [x] Dropped Hill Chart uphill/downhill copy and shop-floor puns (Locker, On the table, Shop board, The push)
- [x] Committee Circles show empty Roll Call / Many hands / One fight so officers can start them; Hall still hides empty extras. **Start Many hands** creates the first board
- [x] ADR-017 frames solidarity collaboration, not a Basecamp parody
- [x] What's new: `portal-solidarity-names` (Hub audience) on `/updates`
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/constants/updates.test.ts src/lib/portal/portal.test.ts src/components/portal/portal-nav-model.test.ts`

## Quote Card social formats (2026-08-19)

- [x] Quote Card Format SegControl: square (default), landscape (FB), portrait 9:16 — same `?aspect=` helper as Graphic Maker
- [x] Landscape chrome tightened so long quotes fit `1200/630`; portrait preview width capped like Graphic Maker
- [x] QOL: stripe / centered / large-mark layouts; bargaining / solidarity / member starters (`?preset=`); ToolColourSection + PNG `ToolExportActions`
- [x] What's new: `quote-card-formats` on `/updates` (updated same day)
- Verify: `npm run test:unit -- src/lib/comms/quote-card.test.ts src/lib/comms/layout-class-matrix.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts`

## Comms stay free / hosted Hub cost (2026-08-19)

- [x] `/manifesto` narrowed: Comms stay free; hosted Officer Hub / Local Portal has a hosting cost; self-host stays an option. Nav label **Built in solidarity**. Dropped “always will be” / “no premium tiers”
- [x] Support, Home/PWA/share SEO, README, VISION, ADR-019, CONTRIBUTING, AGENTS, COMMS nav
- [x] What's new: `comms-stay-free` on `/updates`
- [x] Feature-request issue template names the Comms-free / hosted Hub cost split
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/lib/pwa/install-copy.test.ts src/lib/comms/smoke-asserted-copy.test.ts`

## Photo Consent guide revamp (2026-08-19)

- [x] `/guide/photo-consent` now names member protection (probation, employer watch), three event settings, and an immediate take-down rule, then the existing before-you-post checklist
- [x] Warning callout for employer retaliation; Graphic Maker / Privacy / Resources links and SourcesBlock kept
- [x] What's new: `photo-consent-howto` on `/updates`
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/lib/comms/smoke-asserted-copy.test.ts`

## Hub demo PT collection seeds (2026-08-19)

- [x] Memory demo now has **distinct PT Support examples** (not FT clones): grev-002 note/comm/evening Step 2 meeting, additional-hours informal log + snippet, PT task, PT check-in, PT discussion, PT steward on the officer roster
- [x] Local-wide rows (LEC booking, untagged informal log) still appear in both collections; bumping stays FT-only
- [x] Switch collection to PT or log in as `steward-pt.243@unionops.test` to see the split
- Verify: `npm run test:unit -- src/lib/hub/demo-collection-seed.test.ts`
## Install page QoL (2026-08-19)

- [x] `/install` rewritten phone-first: why (home screen, honest offline shell, no store/login), numbered iPhone / Android / computer steps, privacy + missing-Install Callout
- [x] H1 matches footer/nav (“Install as an app”); Mac Safari Add to Dock kept as a computer aside; Android Install vs shortcut still named
- Verify: `npm run test:unit -- src/lib/pwa/install-copy.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/smoke-asserted-copy.test.ts`

## Email & outreach guide how-to (2026-08-19)

- [x] `/guide/email-broadcast` rewritten as a practical how-to: email as the official record, anatomy of a readable union mail, BCC and employer-inbox warnings, privacy-by-design toolkit framing
- [x] Flyer Maker added to the copy/mailto tool list; Officer Hub reminder draft stays a muted separate-surface note (no SMTP/cron in volunteer copy)
- [x] What's new: `email-outreach-howto` on `/updates`
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/lib/comms/smoke-asserted-copy.test.ts src/lib/constants/comms-sources.test.ts`

## Membership signup playbook revamp (2026-08-19)

- [x] `/guide/membership-signup` expanded from 3-step tool funnel to full steward playbook: density framing, 1-on-1 conversation, paper vs digital workflows, privacy warnings, materials steps, post-signup onboarding, pre-print checklist
- [x] TOC jump nav, warning callouts, preset deep links (`membershipFtPt`, `joinUnion`, `welcome-letter`), cross-links to Print and Email & outreach guides
- [x] EN/FR copy + SEO meta aligned to new title/subtitle
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts` · smoke: `e2e/builders.smoke.spec.ts` membership-signup heading

## OPSEU membership links by sector (2026-08-19)

- [x] Brand Kit: OPSEU + CAAT Support still shows **CAAT Support Full-Time** and **CAAT Support Part-Time** membership application links
- [x] Other OPSEU sectors show one **OPSEU Membership** link (audience All members) to `https://hub03.opseu.org/Forms/emaweb`
- [x] Switching sector replaces membership starters; leftover CAAT FT/PT forms on a non-CAAT kit align on hydrate
- [x] What's new: `opseu-membership-sector` on `/updates`
- Verify: `npm run test:unit -- src/lib/brand/membership-primary.test.ts src/lib/brand/collection-profiles.test.ts src/lib/constants/unionPresets.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`

## What's new agent rule (2026-08-18)

- [x] Always-on rule [`.cursor/rules/whats-new.mdc`](../.cursor/rules/whats-new.mdc): prepend `UPDATES` + EN/FR copy in the same change as a steward-facing ship
- [x] Cross-linked from `AGENTS.md`, `.cursorrules`, `platform.mdc`, `roadmap-next.mdc`
- Verify: `npm run test:unit -- src/lib/constants/updates.test.ts`

## What's new page (2026-08-18)

- [x] Public `/updates` — dated, filterable notes of new tools, guides, and improvements (newest first; Hub notes hide unless Officer Hub is advertised)
- [x] Quiet placement: Guides → About + footer; sitemap + EN/FR SEO; catalog in `src/lib/constants/updates.ts`
- Verify: `npm run test:unit -- src/lib/constants/updates.test.ts src/components/layout/nav/nav-config.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts` · smoke: `e2e/builders.smoke.spec.ts` updates heading + axe

## Graphic Maker 9:16 stills (2026-08-18)

- [x] Graphic Maker Format adds **Portrait (Reels)** (`aspect-[9/16]`) alongside landscape and square; `?aspect=portrait` deep-link from `/guide/short-form`
- [x] Spotlight/results no longer clobber an explicit portrait choice; preview column caps width so layout-class fit still holds
- [x] Social Examples `reel-picket` vertical post; Graphic Maker / Resizer / Captions reverse-link the short-form guide
- Verify: `npm run test:unit -- src/lib/constants/examples.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts` · layout-class: `npx playwright test e2e/tools.layout-matrix.smoke.spec.ts -g "graphic maker"`

## Short-form video guide (2026-08-18)

- [x] `/guide/short-form` — filming, native-first phone editors, evergreen posting (one ask); EN/FR lockstep
- [x] Guides → By channel + First week socials tertiary + Resources + Blueprint; Photo Consent video bullets
- [x] `comms-sources` Instagram Reels + YouTube Shorts help (no product affiliate links; no embeds)
- [x] Editor registry `short-form-editors.ts` (CapCut last, not default)
- Verify: `npm run test:unit -- src/lib/constants/short-form-editors.test.ts src/components/layout/nav/nav-config.test.ts src/lib/comms/first-week-roadmap.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/comms-sources.test.ts`

## Local Portal lived-in Station (2026-08-18)

- [x] Demo seed dates follow “now”, so Station week digest, Floor, and Bulletin look current
- [x] Station opens on Hall (Open Hall), hides a zero digest, shows Coming up / Actions / Bulletin, and tucks search behind a disclosure
- [x] Hall hides empty committee tools (Pipeline, Roll Call, Momentum, Oversight) until that Circle has them
- Verify: `npm run test:unit -- src/lib/portal/portal.test.ts src/components/portal/portal-nav-model.test.ts src/lib/comms/public-copy-style.test.ts` · `npx playwright test e2e/portal.smoke.spec.ts`

## Website Template WordPress theme ZIP (2026-08-18)

- [x] Second export: classic PHP theme wrap of the same HTML/CSS/JS (`generateWordpressThemeZip`) — Appearance → Themes upload folder
- [x] Extra WordPress pages (`page.php`), 404, skip link, branded `screenshot.png`, and a Primary menu with Home/About/Officers/Contact fallback
- [x] Website Guide + tool copy: WordPress is unsupported-optional; Squarespace cannot install a custom theme ZIP (no Squarespace export)
- [x] No WXR, FSE, or Squarespace export
- Verify: `npm run test:unit -- src/lib/templates/website/generate-wordpress-theme-zip.test.ts src/lib/templates/website/generate-website-zip.test.ts src/lib/comms/public-copy-style.test.ts`

## Local Portal QOL after chrome (2026-08-18)

- [x] Rank-and-file sign-in lands on Station (`/portal`), not an empty Officer Hub dashboard; `/app` sends members to Station too
- [x] Circle tool tabs write `?tab=` so refresh and share keep the same tool; Dispatch pings open that tool; Front dates live under Front dates, not the Circle heading
- [x] Empty, error, and create-fail states name a next step (Try again); Dispatch unread count is labelled for assistive tech
- Verify: `npm run test:unit -- src/lib/portal/portal.test.ts src/components/portal/portal-nav-model.test.ts src/lib/comms/public-copy-style.test.ts` · `npx playwright test e2e/portal.smoke.spec.ts`

## Website Template hero art v0 (2026-08-18)

- [x] Hero background picker: colour-only, three replaceable greyscale patterns (bands / mesh / horizon), or an optional photo upload
- [x] Patterns ship under `public/assets/website-heroes/` and copy into the ZIP as `assets/hero.svg`; photo-consent link + alt on upload
- [x] No member photos, officer headshots, or identifiable campus stills — patterns can be swapped later without changing ids
- Verify: `npm run test:unit -- src/lib/templates/website/hero-art.test.ts src/lib/templates/website/generate-website-zip.test.ts src/lib/comms/public-copy-style.test.ts`

## Local Portal chrome parity (2026-08-18)

- [x] `/portal` matches Officer Hub chrome: Demo banner, session-data banner, sticky PortalNav + Portal menu drawer
- [x] Header account cluster links Local Portal; members get it as the filled CTA, officers keep Officer Hub on public pages
- [x] Station no longer duplicates Dispatch / Fronts / Sidebars chips; Circle tools scroll instead of wrapping
- Verify: `npm run test:unit -- src/components/portal/portal-nav-model.test.ts src/lib/portal/portal.test.ts src/lib/comms/public-copy-style.test.ts` · `npm run test:smoke` (`e2e/portal.smoke.spec.ts`)

## Print Communications Guide expansion (2026-08-18)

- [x] `/guide/print` is a practical how-to: why print still matters, flyer Glance Test / one call to action / QR bridge, board posting realities, and budget printing logistics
- [x] Callouts for takeaways and collective-agreement posting rights; EN/FR lockstep; Flyer Maker, Board Notice Maker, and QR Link Cards stay linked
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/smoke-asserted-copy.test.ts`

## Officer tools dashboard catalog (2026-08-18)

- [x] Hub dashboard lists the full Officer tools kit (Casework / Records / Funds / Administration) with blurbs — no longer a leftover card of four links
- [x] Hybrid data sits in Casework with the rest of the kit; Officer tools ▾ is first in the desktop hub bar
- [x] Nav and dashboard share one catalog (`hub-tool-catalog.ts`) so a new tool cannot land in the menu only
- Verify: `npm run test:unit -- src/components/hub/hub-tool-catalog.test.ts src/components/hub/hub-nav-model.test.ts src/lib/comms/public-copy-style.test.ts`

## From Scratch to Solidarity workshop path (2026-08-18)

- [x] Public `/guide/workshop` hour matches the listing: strategy, Logo Builder, Social Examples, Graphic Maker + Quote Card, Website Template last
- [x] 20-minute Demo Path chips/trail: Logo Builder → Social Examples → Graphic Maker → Quote Card → Website Template (Brand Kit/onboarding count as the logo stop)
- [x] Board Notice, Captions, and Flyer Maker stay off the pitch card; First week still has print and boards
- Verify: `npm run test:unit -- src/lib/comms/workshop-demo-session.test.ts src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/smoke-asserted-copy.test.ts src/lib/comms/first-week-roadmap.test.ts`

## Home landing copy QOL (2026-08-18)

- [x] Hero: benefit-driven H1 + cohesive subtitle (time + professional voice); path headers state the value
- [x] Toolbox intro ties the four channels together; channel blurbs emphasize ready-to-use templates
- [x] Privacy banner: private by design / Comms never leave the browser; Officer Hub host still controls that data
- [x] EN/FR lockstep; smoke region + trust-banner assertions updated
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/smoke-asserted-copy.test.ts`

## Website Template preview fonts (2026-08-18)

- [x] Preview iframe `allow-same-origin` so Brand Kit `@font-face` can load (`font-src 'self'` was blocking unique-origin sandbox → Arial fallback)
- [x] ZIP body faces include weight 700 so nav/CTA/email are not faux-bold; drop the heavy hero text-shadow
- Verify: `npm run test:unit -- src/lib/comms/canvas-fonts.test.ts src/lib/templates/website/generate-website-zip.test.ts`

## Workshop outline lunch-and-learn QOL (2026-08-18)

- [x] `/guide/workshop` is a standalone teaching page: what to bring, timed 45–60 min agenda with Facilitator / Do this notes, Quick links around Demo Path, and next steps
- [x] 20-minute chips stay four stops; Quick links + wrap name Website Template as the trail fifth after Brand Kit, Board Notice, Graphic Maker, and Captions (Logo Builder stays inside Brand Kit; QR Board is not the notice)
- [x] EN/FR copy lockstep; smoke asserts the new headings
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/smoke-asserted-copy.test.ts`

## Website Template Brand Kit links and about seed (2026-08-18)

- [x] Exported site footer/contact include Brand Kit custom links and membership URLs (http(s) only)
- [x] Name + about paragraph seed from union preset and collection labels after Brand Kit hydrate — no more CAAT “support staff” default for every local
- Verify: `npm run test:unit -- src/lib/templates/website/brand-kit-fields.test.ts src/lib/templates/website/generate-website-zip.test.ts src/lib/comms/public-copy-style.test.ts`

## OPSEU PT collection membership primary (2026-08-18)

- [x] College Support Part-time collection selects **CAAT Support Part-Time** as the membership Primary link (FT collection keeps Full-Time)
- Verify: `npm run test:unit -- src/lib/brand/membership-primary.test.ts src/lib/constants/unionPresets.test.ts`

## HubNav drawer + Officer tools clamp (2026-08-18)

- [x] Hub chrome uses a **Hub menu** drawer below `lg` (no hidden horizontal scroll)
- [x] Officer tools ▾ is grouped (Casework / Records / Funds / Administration) and viewport-clamped like public Tools
- [x] Officer tools drops **under the trigger** (left-aligned); clamp shrinks width before sliding so it does not look left-floated
- [x] Hub bar sticks under `--site-header-height`; Profile / Sign out live in the hub drawer on small screens
- Verify: `npm run test:unit -- src/components/hub/hub-nav-model.test.ts src/lib/utils/flyout-geometry.test.ts`

## Brand Kit canvas preview QR (2026-08-18)

- [x] Mini preview encodes the saved local website, or `https://unionops.org` when none is set (was a blank `qrSrc={null}` plate)
- Verify: `npm run test:unit -- src/lib/brand/canvas-preview-qr.test.ts`

## Website guide two-part rewrite (2026-08-18)

- [x] `/guide/website` split into Part 1 (write and download the ZIP) and Part 2 (publish)
- [x] At-a-glance jump cards, hand-off callout, jargon glossary (repository / commit / deploy), optional custom-domain band
- [x] EN/FR copy lockstep; GitHub Pages and custom-domain docs still from `COMMS_SOURCES`
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/smoke-asserted-copy.test.ts`

## Tools mega-menu viewport clamp (2026-08-18)

- [x] Tools ▾ flyout is `fixed` and clamped so a 40/52rem panel cannot clip off lg/xl laptops (`html { overflow-x: clip }`)
- [x] 4 visual columns only at 2xl; lg/xl stay 2-col. Width/height from `clampFlyoutToViewport`
- Verify: `npm run test:unit -- src/lib/utils/flyout-geometry.test.ts`

## Brand Kit chrome FOUC (2026-08-18)

- [x] Blocking `<head>` script (`BrandChromeInitScript`) applies saved Brand Kit colours to `--opseu-blue` / `--brand-*` before first paint — same contract as display prefs (not `next/script`)
- [x] Header UnionOps mark uses CSS vars until hydrate so it does not stay on default orange while chrome tokens are already correct
- Verify: `npm run test:unit -- src/app/[locale]/layout.hydration.test.ts`

## Desktop PWA horizontal overflow (2026-08-18)

- [x] Home hero full-bleed uses `w-full` instead of `w-screen` / `100vw` (scrollbar gutter was always a few pixels wider than the window)
- [x] `html { overflow-x: clip }` plus `min-w-0` on the flex shell so installed Edge/Chrome apps do not grow a phantom sideways scroll
- Verify: `npm run test:unit -- src/app/globals-overflow.test.ts`

## Share Kit folded into Graphic Maker (2026-08-18)

- [x] Removed the `/tools/share-kit` catalog item (orchestrator only; presets already live on Graphic Maker)
- [x] Permanent redirect `/:locale/tools/share-kit/` → Graphic Maker (keeps `?preset=` for old links)
- [x] Graphic Maker related tools: Captions → Examples → Resizer (workshop path without a second social maker)
- Verify: `npm run test:unit -- src/components/layout/nav/nav-config.test.ts src/lib/comms/packs/channel-packs.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/public-copy-style.test.ts`

## Tools catalog job groups (2026-08-18)

- [x] Tools ▾ / `/tools` regrouped by job: Brand · Union boards · **Print & cards** · Social & web
- [x] QR Card, Action Card, Pulse Poll moved out of Boards / Social into Print & cards (wallet/handouts)
- [x] EN/FR group label `Print & cards` / `Impression et cartes`; four-column mega-menu kept
- [x] Lesson: [`session-knowledge-2026-08-18-tools-catalog-ia.md`](audit/session-knowledge-2026-08-18-tools-catalog-ia.md) — do not 1:1-map catalog columns to First week channels
- Verify: `npm run test:unit -- src/components/layout/nav/nav-config.test.ts src/lib/comms/public-copy-style.test.ts`

## HubNav drops redundant Comms toolbox (2026-08-18)

- [x] Officer Hub menu no longer lists **Comms toolbox** (public Header already has Tools / Guides / home)
- [x] Hub module links use each module’s real `href` (Local Portal is `/portal`, not `/`)
- [x] Dashboard **Your modules** still includes the comms card
- Verify: `npm run test:unit -- src/lib/tenant/tenant.test.ts`

## Board Banner independent corners (2026-08-18)

- [x] Side/bottom rails stay straight when Corner is on (no coloured end caps standing in for joints)
- [x] Corner kit piece prints four upright tiles: top left, top right, bottom left, bottom right
- [x] Design preview picker inspects one corner; the pack sheet cycles all four
- [x] Corners off still uses end-capped rails that run the full edge and meet
- Verify: `npm run test:unit -- src/lib/constants/board-banner-layouts.test.ts src/components/tools/board-banner/BoardTrimCanvas.test.tsx src/lib/comms/public-copy-style.test.ts`

## Demo login on production images (2026-08-18)

- [x] `isDemoAuthEnabled(process.env)` statically reads `NEXT_PUBLIC_DEMO_SITE` so Next inlines the build-time demo flag into `authorize()` (login hint and roster stay in sync)
- [x] Docker runner defaults `AUTH_ALLOW_DEMO_USERS` to the same `NEXT_PUBLIC_DEMO_SITE` build arg
- [x] `/api/health` reports `demoAuthEnabled`
- Verify: `npm run test:unit -- src/lib/auth/sec007.test.ts src/lib/ops/health-status.test.ts`
- [x] Demo roster accepts `demo123` / `Demo123` (hint stays lowercase `demo123`)

## Brand Kit collection profiles (2026-08-17)

- [x] Fresh Brand Kit + `other` preset use one **Local** profile
- [x] OPSEU sector picker (CAAT Support default; OPS, Corrections, LCBO, hospital, municipalities, and the other major sectors)
- [x] CUPE / Unifor / USW / ONA / PSAC ship **named** starter collections + **Other** (no “Additional unit” stubs)
- [x] Completeness CI: [`catalog-completeness.test.ts`](../src/lib/brand/catalog-completeness.test.ts) — codes, labels, sector URLs, EN/FR hints
- [x] In-app add / remove / rename so amalgamated locals can model extra workplaces
- [x] Active profile stays in sync when Local number, sub-text, or code change
- [x] Sourced reference: [`.cursor/rules/brand-kit-collections.mdc`](../.cursor/rules/brand-kit-collections.mdc) + [`session-knowledge-2026-08-17-brand-kit-collections.md`](audit/session-knowledge-2026-08-17-brand-kit-collections.md)
- Verify: `npm run test:unit -- src/lib/brand/catalog-completeness.test.ts src/lib/brand/collection-profiles.test.ts src/lib/constants/unionPresets.test.ts src/lib/utils/local-links.test.ts src/lib/comms/public-copy-style.test.ts`

## Wallet Letter FitWidth (2026-08-17)

- [x] Shared `FitWidthFrame` (`src/components/tools/FitWidthFrame.tsx`) — scale on a parent of `[data-export-root]`; QR Board, QR Card, Action Card
- [x] Letter/tabloid wallet previews lay out at design size then uniform-scale; `wallet*` type stays on `previewWidthPx`
- [x] Compact one-line local label + mark logo on compact wallet sizes; branding stays on after onboarding
- [x] QR share smoke: Letter wider than quarter; 390px FitWidth box; Action Card Show URL; square 5×5 geometry
- Lessons: B12–B14 in [`session-knowledge-2026-08-17-qr-canvas-layout.md`](audit/session-knowledge-2026-08-17-qr-canvas-layout.md); residual gaps + next steps in same file
- Verify: `npx playwright test e2e/tools.qr-share.smoke.spec.ts --grep "@smoke"` (PowerShell: quote grep)

## Site feedback (ADR-018) (2026-08-17)

- [x] Public `/feedback` form (ideas, bugs, accessibility, workshop, other) with consent + honeypot
- [x] Hub send-home `/app/send-feedback` for any signed-in officer; Portal `/portal/send-feedback`
- [x] Platform store (`FEEDBACK_DB_BACKEND`, memory default, migration `0033_platform_feedback`, no tenant RLS)
- [x] `platform_admin` inbox `/app/feedback` (status/note/delete); optional `FEEDBACK_NOTIFY_EMAIL`
- [x] Footer, Support, Accessibility, Privacy, Local 404 discoverability; EN/FR + SEO
- Verify: `npm run test:unit -- src/lib/platform-feedback/platform-feedback.test.ts src/lib/seo/public-page-meta.test.ts src/lib/comms/public-copy-style.test.ts src/lib/db/backend.test.ts`

## Canvas layout-class CI matrix (2026-08-17)

- [x] Shared Playwright helpers (`e2e/helpers/canvas-layout.ts`) + Vitest geometry guards (`canvas-layout-geometry.ts`, `layout-class-matrix.ts`)
- [x] `@smoke` matrix: Flyer/Graphic/Solidarity/Meeting + default Quote/Board Notice/Banner/Pulse Poll (`e2e/tools.layout-matrix.smoke.spec.ts`)
- [x] Extended QR share smoke: tabloid, QR Card reference + Letter 390px, Action Card (`e2e/tools.qr-share.smoke.spec.ts`)
- [x] Flyer Maker `?preset=` deep link; QR Card reference square wrapper; removed `CanvasQrPlate` `maxHeight: 100%`
- Plan: [`docs/audit/plan-2026-08-17-qr-board-canvas-qol.md`](audit/plan-2026-08-17-qr-board-canvas-qol.md) Part D/F3; lessons: [`session-knowledge-2026-08-17-qr-canvas-layout.md`](audit/session-knowledge-2026-08-17-qr-canvas-layout.md)
- Verify: `npx playwright test e2e/tools.qr-share.smoke.spec.ts e2e/tools.layout-matrix.smoke.spec.ts --grep "@smoke"` (PowerShell: quote grep)

## Canvas brand fonts catalog (2026-08-15)

- [x] Self-hosted OFL woff2 under `public/fonts/` + `next/font/local` CSS vars (`src/app/canvas-fonts.ts`)
- [x] Curated catalog + Flyer migration (`src/lib/comms/canvas-fonts.ts`); defaults Montserrat + Source Sans
- [x] Brand Kit `headlineFontId` / `bodyFontId` + panel pickers; tokens on canvas tools / Flyer override
- [x] Board banner/trim drop hardcoded Arial; capture waits `document.fonts.ready`
- [x] ADR-014 amended; COMMS visual system + session knowledge
- [x] Playwright: `e2e/tools.fonts.smoke.spec.ts` (`@smoke` + `@export`) + `e2e/helpers/canvas-fonts.ts`
- [x] Website ZIP embeds subset `@font-face` + woff2 + `NOTICE.txt`; Office DOCX/PPTX map catalog → face names (not binary embed)
- [x] Quote Card + Action Card Oswald matrix rows; Pulse Poll Hub-auth Oswald `@export` case
- [x] Variable fonts deferred (static bundle ≈ 278 KB)
- Verify: `npx playwright test e2e/tools.fonts.smoke.spec.ts` (quote `@smoke` / `@export` on PowerShell)
- Unit: `npm run test:unit -- src/lib/comms/canvas-fonts.test.ts src/lib/templates/website/generate-website-zip.test.ts src/lib/export/office-export.test.ts src/lib/export/office-docx-builders.test.ts`

## COPY-004 FR caption bodies (2026-08-15)

- [x] Template category/title/caption in `messages` EN/FR; ids + hashtags in `captions.ts`
- [x] `/captions` page locale-aware; placeholders + `#LocalUnion` preserved
- [x] Backlog COPY-004 closed; unit coverage for template meta
- Verify: `npm run test:unit -- src/lib/comms/public-copy-style.test.ts src/lib/constants/captions.test.ts`

## Ops durable verify (2026-08-15)

- [x] `npm run ops:verify-durable` green locally (migrate → seed → durability → RLS)
- Host production flip remains operator choice (`docker-compose.durable.yml` + `HEALTH_REQUIRE_DURABLE=true`)

## COPY-005 EN readability report (2026-08-15)

- [x] Shared `PUBLIC_NS` / `HUB_NS` + `leavesFor` in `src/lib/comms/copy-namespaces.ts`
- [x] Dependency-free Flesch–Kincaid helper + unit tests (`readability.ts`)
- [x] `npm run copy:readability` prints worst 20 public + Hub EN leaves (>8 words); exit 0
- [x] Snapshot [`docs/audit/copy-readability-2026-08.md`](audit/copy-readability-2026-08.md); backlog closed (no hard grade ceiling)
- Verify: `npm run copy:readability` and `npm run test:unit -- src/lib/comms/readability.test.ts`

## Phase 9e — export preview↔download comparison (2026-08-15)

- [x] `compareRasters` / `resizeRasterNearest` in `src/lib/export/fidelity.ts` (+ unit tests)
- [x] `data-export-root` on capture canvases + `ExportCaptureBridge` on `ToolEditorLayout`
- [x] `e2e/tools.export.fidelity.spec.ts` (`@export`) — PNG/PDF for all canvas tools; ZIP/Office/SVG for the rest
- [x] `npm run test:export`
- Spec: [`docs/ROADMAP.md`](ROADMAP.md) Phase 9e

## Ops Postgres flip tooling (2026-08-15)

- [x] Local durable path: Postgres container + migrate (URL-encoded passwords)
- [x] `scripts/verify-durable-local.mjs` + `npm run ops:verify-durable` (migrate → seed → durability → RLS)
- [x] Durability smoke skips re-seed when reference tenant exists; documents owner URL vs app-role RLS smoke
- [x] `POSTGRES_OPS.md` — encode passwords; one-shot verify command
- Host production flip remains an operator choice (`docker-compose.durable.yml` + `HEALTH_REQUIRE_DURABLE=true`)

## COPY-002 smoke↔catalog guard (2026-08-14)

- [x] Extract plain `getByText` / `name:` literals from public Comms smoke specs
- [x] Unit test requires each literal in `messages/en.json` (allowlist: COMMS_SOURCES bibliography title only)
- [x] Documented in `i18n-public-copy.mdc`; backlog COPY-002 closed
- Verify: `npm run test:unit -- src/lib/comms/smoke-asserted-copy.test.ts`

## Phase 9 — Comms export integrity (SHIPPED 2026-08-14)

- [x] **9a / TOOL-008:** Capture hardening (`capture.ts` — unscale preview, inline computed styles); Flyer inline aspectRatio; PDF JPEG re-encode
- [x] **9b / TOOL-008:** Fidelity helpers + unit tests (`fidelity.ts`, `capture.test.ts`)
- [x] **9c / TOOL-009:** Playwright tool-output smoke — Flyer PNG/PDF, Graphic PNG, Board Notice PDF
- [x] **9d / TOOL-009:** Solidarity Poster PNG output smoke
- Spec: [`docs/ROADMAP.md`](ROADMAP.md) Phase 9; suite `e2e/tools.export.smoke.spec.ts`

## Unified Comms tools experience (2026-08-14)

- [x] Wave 1 chrome: `purposeHint` / `previewActions` / BrandSetup toolbar on pulse-poll, board-banner, action-card, qr-board; Resizer `ConsentModal`; Flyer invite email in footer
- [x] Wave 2: `ToolColourSection` + `ToolExportActions`; board-notice options collapse; shell checklist in `tool-editor-ux.mdc`
- [x] Wave 3: ThemePicker tools via colour section (built-in ContrastChecker); `?preset=` deep links; channel packs doc + `channel-packs.ts`
- [x] Wave 4: Share Kit v0 orchestrator (`/tools/share-kit`) — Graphic Maker + Captions + Resizer, no new canvas *(folded into Graphic Maker 2026-08-18)*
- [x] Session knowledge: [`docs/audit/session-knowledge-2026-08-14-flyer-unified-tools.md`](audit/session-knowledge-2026-08-14-flyer-unified-tools.md)

## Flyer Maker QOL v2 (2026-08-14)

- [x] Layouts: stack / colour band / split / photo hero
- [x] Paper sizes: letter, half-letter handbill, tabloid (PNG + PDF inches)
- [x] System font stacks (ADR-014): Impact, condensed, clean, slab, serif + case/type-scale controls
- [x] Presets: picket, rally, membership meeting, walkabout
- [x] Optional QR (`CanvasQrPlate`) + photo/duotone with consent modal
- [x] Invite email draft panel; body/contact fields; dynamic preview a11y name
- [x] Unit coverage in `src/lib/comms/flyer-maker.test.ts`; SEO + Print Guide copy updated

## Home composition v2 + COPY-001 (2026-08-12)

- [x] Two-zone `lg+` hero: message column + `HomeHeroPreview` (Brand Kit–coloured board notice + swatches)
- [x] `COPY-001`: Comms path uses `pathCommsCta` only; roadmap outline stays in hero
- [x] EN/FR `home.heroPreview.*`; smoke asserts preview + de-dup when hub public
- [x] Docs/backlog/roadmap marked closed

## Public marketing layout rules (2026-08-12)

- [x] New [`.cursor/rules/public-marketing-ux.mdc`](../.cursor/rules/public-marketing-ux.mdc) — Home two-zone hero, effort bar, re-touch license
- [x] [`responsive-layouts.mdc`](../.cursor/rules/responsive-layouts.mdc) — shell vs composition; empty-half / gradient-as-product / shell-as-alibi rejects
- [x] Cross-links: `comms-public-ux`, `tool-editor-ux`, `page-shell.ts`, `AGENTS.md`, `.cursorrules`, `roadmap-next`
- [x] Docs unfreeze: `COMMS.md`, `COMMS_BACKLOG.md`, `PROGRESS` landing v2 open; `COPY-001` paired with composition v2

## Officer Hub copy QOL pass (2026-08-11) — COPY-003

- [x] Audit: [`docs/audit/hub-copy-qol-2026-08.md`](audit/hub-copy-qol-2026-08.md) — 1,643 Hub leaves EN/FR; classified `localLinks`/`membershipUrls` as public Brand Kit; prioritized `rsvpPublic`/`meetingPublic` (token pages)
- [x] Correctness: FR `locataire` → syndicat; OPSEU/CAAT hardcodes removed from onboarding; MFA/`*_DB_BACKEND` env leaks rewritten; hybrid FR `magasin` → Hub des dirigeants; RSVP `ce local` → section locale; qol FR steward + dropped read-only remedy restored
- [x] Jargon: tenant/slug/overlay/memory store/QOL/slice → plain officer language; bare “the hub” → Officer Hub
- [x] Weak UX states: densest error/empty strings now name a consequence and a next action (money, invites, hybrid, grievance/bumping/time, org modules, RSVP)
- [x] Guards: sibling `HUB_NS` suite in `public-copy-style.test.ts`; `rsvpPublic`/`meetingPublic`/`localLinks`/`membershipUrls` added to `PUBLIC_NS`; injection harness confirmed 10/10 bites
- [x] Smoke pin: `e2e/hub.org.spec.ts` Union setup / Configuration du syndicat
- [x] `COPY-003` marked closed in [`execution-backlog.md`](audit/execution-backlog.md)

## Public copy QOL audit + voice enhancement (2026-08-11)

- [x] Audit: [`docs/audit/public-copy-qol-2026-08.md`](audit/public-copy-qol-2026-08.md) — flattened both catalogs (EN/FR parity clean) and screened for lowercase sentence starts, verbless fragments, jargon, stacked em dashes, untranslated FR, and EN↔FR semantic drift
- [x] Correctness: FR strings that said the opposite of EN — most seriously `photoConsentGuide.toolbox.content` ("group photos **without** individual consent"), plus `flyerMaker.subtitle` ("Tractus"), `websiteGuide.maintain.intro` ("vaut pire"), `crisisGuide` Brand-Kit-vs-union colours, and `routeUi.notFoundBody` ("changé de camp" = switched sides)
- [x] Locked-term drift: bare "the hub" removed from public pages (`resources.explore`, `accessibility.feedback`, `supportPage.p2`, `footer.privacy`, `installPage.limitsNetwork`, `metadata.*`); FR normalized from Portail/Centre/Hub to **Hub des dirigeants**; FR "trousse de marque" → **Trousse de marque** (23) and EN "brand kit" → **Brand Kit**
- [x] Jargon off volunteer pages: "reference tenant defaults", "canvas chrome", "type scale", "progressive web app flow", "PCI workflows", "share slug", "Diary every CA deadline", "brand chrome", "CTA"
- [x] Fragments restored to sentences (the removed word ceiling's residue): `emailBroadcastGuide.sections.checklist`, `home.channelsIntro`, `resources.purpose`/`checklist.intro`, `installPage.whereBody`, `printGuide.sections.flyers`, and all nine FR `whenToUse` hints (which had lost subject, verb, and a trailing clause each)
- [x] EN↔FR drift: FR had three names for a flyer (→ **tract**), two for alt text (→ **texte alternatif**), three for the duty of fair representation (→ **DRE**), and carried EN statute acronyms OHSA/ESA beside their French equivalents (→ **LSST**/**LNE**); restored clauses FR had dropped; fixed `local243.org` example domain
- [x] UX states: `brandKit.importSuccess`/`importError`, `pulsePoll.saveError`, and `common.exportPartial` now name a consequence and a remedy; `installPage.relatedMid` no longer reads as gratuity; the two identical workshop notes differ; "your central union" → "your provincial or national union"
- [x] SEO: eight page + eight tool descriptions expanded off the thin end toward the ~150-char snippet budget (one concrete clause each, no keyword stuffing); French colon/semicolon spacing applied to 24 strings and `home.title`
- [x] Fixed stale `e2e/builders.smoke.spec.ts` banner assertion (`Local-first Comms` no longer exists in the catalog)
- [x] Green: `npm run lint`, `npm run test:unit` (127 files / 718 tests)

### Guards + knowledge capture (same day)

- [x] `public-copy-style.test.ts` extended from 3 checks to 10: sentence capitalization (EN+FR, with an abbreviation allowlist), no bare "the hub" in EN, one French name per locked term, French space before `:`/`;`, banned developer jargon, and no untranslated FR. `PUBLIC_NS` now includes `nav`/`share`/`consent` — `nav` carries the locked tool names and was never being scanned
- [x] `public-page-meta.test.ts` gained a description band (95–165 chars, deliberately a band not a target), duplicate detection per locale, and the same lowercase-sentence check
- [x] Verified the new guards by injecting **13 deliberate regressions** one at a time and confirming each fails the suite; that negative test is what exposed the missing `nav` namespace
- [x] Guard run also caught four strings the manual pass missed: `actionCard.cta`/`showUrl` and `examples` still said "CTA", and `seniorityGuide` said "the Hub bumping case ID"
- [x] New rule [`.cursor/rules/i18n-public-copy.mdc`](../.cursor/rules/i18n-public-copy.mdc); cross-linked from `AGENTS.md`, `.cursorrules`, `comms-public-ux.mdc`, `roadmap-next.mdc`
- [x] Session knowledge: [`docs/audit/session-knowledge-2026-08-11-public-copy-qol.md`](audit/session-knowledge-2026-08-11-public-copy-qol.md) — why structural tests passed while a consent instruction was inverted, and the Windows/PowerShell/`ftruncate` editing hazards
- [x] Next steps as tickets: `COPY-001`…`COPY-005` in [`execution-backlog.md`](audit/execution-backlog.md) (home hero CTA de-dup, spec-literal rot check, Hub copy pass, FR caption bodies, optional readability floor)

## Drop blanket word-count guard (2026-08-11)

- [x] Removed the blanket 30-word per-leaf ceiling test from `public-copy-style.test.ts` — it optimized for brevity over clarity and rewarded clipping subjects/verbs out of body copy (the root cause of the telegraphic strings fixed below)
- [x] Kept the good guards: the *named* lead-length checks (home subtitle, First-week/Resources intros, etc.) and the ≤1 em-dash-on-lead-fields cap
- [x] `comms-public-ux.mdc`: added "body copy is not a lead — complete sentences, no clipping to hit a count; no blanket ceiling" principle

## Public copy voice rewrite (2026-08-11)

- [x] Voice pass on public strings that prior length cuts left telegraphic/jargon-y: `privacyPage.hubIntro` (dropped "memory"/"tenant isolation" for plain language), `installPage.androidBody`, `crisisGuide.intro` (fixed fragment lead), `brandKit.purposeSetsBody`/`purposeUnlocksBody`/`description`, `websiteGuide.domain.tip`, `seniorityGuide.hub.body`, `home.trustBanner*`, `actionCard.privacyHint` — EN + FR lockstep
- [x] Removed marketing verb "drive" from Brand Kit copy + SEO (`public-page-meta` `/onboarding`, `/brand-kit`) in favour of "reuse across every tool"
- [x] Kept legal disclaimers intact (seniority/RTR "Aid only — not legal advice")
- [x] Full public-namespace readability sweep (EN+FR): catalog was largely healthy; fixed residual clipped/fragment leads (`printGuide.subtitle`, `documentGenerator.subtitle`, `emailBroadcastGuide` when), removed lingering "drive" (`socialMediaPlan` step 0) and jargon ("public launch surface"). Authenticated Hub `/app` copy left out of scope.
- [x] Style guard still green: `src/lib/comms/public-copy-style.test.ts` (named lead-length limits + ≤1 em dash on lead fields)

## Public copy streamline (2026-08-10)

- [x] Shorter public subtitles/intros (home, First week, Resources, tools, guides) EN + FR
- [x] Em dashes used sparingly (contrast pairs OK; stack avoided on lead chrome)
- [x] `common.setupBrandPrompt` / `BrandSetupPrompt` defaults; privacy page moved to `privacyPage.*`
- [x] SEO/tool meta scrub + style note in `.cursor/rules/comms-public-ux.mdc`
- [x] Unit guard: `src/lib/comms/public-copy-style.test.ts`
- [x] Phase 2: trim Blueprint / Union Boards / Website / Print / email / photo / DFR / RTR / accessibility body copy; drop duplicate per-tool `setupBrand*` keys (doc-gen prompt override kept)
- [x] Phases 3–5: residual Website/Union Boards/privacy/manifesto/install/Brand Kit/tool hint trim; public leaf ceiling under 30 words (routeUi quips may keep a single em dash)

## Workshop multiphase A/B/C + Gap Fit (2026-08-09)

- [x] Phase A: Day-of run sheet; `e2e/workshop.smoke.spec.ts` demo quartet @smoke
- [x] Phase B: `exportSuccess` on remaining canvas tools + doc-gen; RelatedTools / `purposeHint` / BrandSetup on quiet demo tools; Captions → Graphic Maker CTA
- [x] Phase C: branch/worktree hygiene; lint + unit gate for workshop-touched surfaces
- [x] Gap Fit: [`docs/audit/workshop-gap-fit-2026-08.md`](audit/workshop-gap-fit-2026-08.md); linked from `comms-public-ux.mdc`
- [x] Session knowledge + cross-links: [`docs/audit/session-knowledge-2026-08-09-workshop-comms.md`](audit/session-knowledge-2026-08-09-workshop-comms.md) (AGENTS / ground-truth / rules)

## Local 404 solidarity status pass (2026-08-09)

- [x] Shared `RouteStatusPanel` / `RouteStatusStatic` — Local 404 chrome, UnionOps mark, Solidarity closer
- [x] Stable-hash rotating EN/FR quips (`routeUi.quips`) with path buckets (hub/portal/poll/rsvp/meeting/error)
- [x] Quiet Local 243 footnote + deepen snowmobile egg (5× mark tap; `public/easter-eggs/`)
- [x] Portal `not-found` / `error` / `loading`; root `not-found` + `global-error` (kills Next stock 404)
- [x] Poll / RSVP / meeting misses call `notFound()` for true HTTP 404
- [x] CI: opt in demo auth for production `next start` smoke (`AUTH_ALLOW_DEMO_USERS`) + 15m globalTimeout — unblocks CapRover after CredentialsSignin hang
- [x] Session knowledge: [`docs/audit/session-knowledge-2026-08-09-local-404.md`](audit/session-knowledge-2026-08-09-local-404.md)

## Public Comms workshop UX pack (2026-08-08)

- [x] Copy/terminology pass (EN/FR): Graphic Maker, Image Resizer, UnionOps Comms vs hub, Brand Kit CTAs, Pulse Poll / email guide volunteer-safe
- [x] Workshop Demo Path, `/guide/workshop`, facilitator run sheet `docs/guides/WORKSHOP_SOCIAL_COMMS.md`, First week 4-week calendar
- [x] Tools blurbs + denser home/tools grids; Related tools footer; export success + `aria-controls` on ToolEditorLayout
- [x] Cursor knowledge: `.cursor/rules/comms-public-ux.mdc` + cross-links from responsive-layouts / tool-editor-ux / comms-module

## Local Portal Circles re-landed (2026-08-08)

- [x] Re-land Circles memory MVP on current main (Station, Circle workspace P0–P4, Dispatch/Fronts/Sidebars)
- [x] Solidarity naming + `/portal` routes + `enabledModules.portal` + `local_member` demo user (`passwordHash`)
- [x] Explicitly **excluded** Postgres identity / register / approvals fork from experimental branch
- [x] ADR-017 + `docs/modules/LOCAL_PORTAL.md`; Hub tile does not require MFA


## Comms visual system stop-gap pass 2 (2026-08-06)

- [x] Meeting field fills yield to Brand Kit surfaces; QR/Action plain modes use `canvasSurfaceStyle`
- [x] Solidarity split/banner token pads; OfficePresetMock density pad (`officeMockPaddingPx`)

## Comms visual system stop-gap pass (2026-08-06)

- [x] Close incomplete token wiring: graphic Solidarity/Spotlight/Quote/Results, QR Board type/pad/align
- [x] Board Notice lead type; Quote Card outer surface; Solidarity headline tracking/weight; Notice uses shared `layoutChrome`

## Comms visual system phase 5 (2026-08-06)

- [x] Board Banner / Trim type + surface tokens; Logo Builder + Resizer `LocalLogoPlate` / frames
- [x] Website template CSS knobs from Brand Kit canvas; QR plate accent border + shadow (modules B/W)
- [x] Helpers `clampTypeRem` / `bannerPadPercent` + unit/Website CSS tests

## Comms visual system phase 4 (2026-08-06)

- [x] Wallet helpers (`walletTitle*` / pad / gap) + QR Card / Action Card type chrome
- [x] Graphic Maker `NoticeLayout` surface/grain/pad/type; Pulse Poll wallet type/pad; Meeting `side-panel` token pad
- [x] Unit coverage for wallet helpers

## Comms visual system phase 3 (2026-08-06)

- [x] `typeScaleFactor` / `contentPaddingPx` / `meetingAlignFromBias` — Brand Kit knobs now affect layout matrices
- [x] Meeting Background: rem scale + token padding + asymmetric face-safe anchors
- [x] Solidarity stack alignment/padding; flyer/board-notice meta type; graphic Results bias
- [x] Brand Kit mini preview QR placement + asymmetric type block

## Comms visual system phase 2 (2026-08-06)

- [x] Solidarity Poster + Meeting Background: `canvasSurfaceStyle` + grain (layout matrices unchanged)
- [x] Solidarity / QR Board: `CanvasQrPlate` for export QR chrome
- [x] Document Generator `OfficePresetMock` type scale via `officeMockTypography`
- [x] Quote Card / `QuoteLayout` surface + grain tokens
- [x] Migration register complete in `COMMS_VISUAL_SYSTEM.md`

## Comms visual system — Brand Kit canvas tokens (2026-08-06)

- [x] `BrandKit.canvas` + `resolveCanvasTokens` (`solid` / `field` / `workshop`; grain + duotone surfaces)
- [x] Shared primitives `src/components/tools/canvas/` + Brand Kit Canvas style panel (EN/FR)
- [x] Migrated flyer, board-notice, QR card/action/pulse, graphic-layouts (+ duotone photos), QR board grain
- [x] `docs/modules/COMMS_VISUAL_SYSTEM.md` + `.cursor/rules/comms-visual-system.mdc`
- [x] Unit tests `canvas-tokens.test.ts`

## Wider desktop shells + Brand Kit workspace (2026-08-01)

- [x] `PAGE_SHELL.chrome` → `max-w-[100rem]`; `wide` → `max-w-[90rem]` with `px-4 sm:px-6 xl:px-8`
- [x] Brand Kit promoted from `focus` to **wide** multi-panel workspace (paired settings/logo/links; export/import near heading)
- [x] Home hero + QR-card fallback aligned to shared wide shell; examples/captions denser at `2xl`; `/assets` two-column kit/reference layout
- [x] Public RSVP/poll/next-meeting use `PageShell focus` (no nested `max-w-lg`); Hub auth forms drop double horizontal padding
- [x] Board Notice + Graphic Maker invite/sources moved into `ToolEditorLayout` `footer` (no sibling shells)
- [x] Hub leftovers: `nestedFocus` / `nestedAuth` / `nestedProfile` for forms inside `/app` wide; Hub error/not-found on `nestedFocus`
- [x] Login / MFA / magic sign-in / profile migrate to `PageShell nestedAuth` / `nestedProfile` (no ad-hoc max-w)
- [x] `/guide` index → `GuideLayout size="wide"` (path grid + two-column chapters); child guides stay `read`
- [x] Responsive rules + tool-editor register updated; smoke checks overflow at 1920

## Brand Assets page for every union (2026-07-31)

- [x] `/assets` uses `PageShell` wide; always shows live Brand Kit colours + logo (copy hex, download when raster available)
- [x] OPSEU reference pack (static logos + `ASSET_PACK_COLORS`) only when preset unset or `opseu`
- [x] Removed non-OPSEU dead-end Callout; white/near-white swatches use checker backdrop

## Multi-union sources + asset pack gate (2026-07-30)

- [x] Session knowledge [`session-knowledge-2026-07-30-multi-union-sources.md`](audit/session-knowledge-2026-07-30-multi-union-sources.md) — OPSEU citation gating, logo bundling stance
- [x] `CommsSource.unionIds` + `getSourcesForPage(pageId, unionPresetId)` / `SourcesBlock` + Resources list filter by Brand Kit
- [x] `/assets` shows OPSEU pack only when preset unset or `opseu`; otherwise Brand Kit CTA *(superseded 2026-07-31 — kit always shown; pack gated)*
- [x] Website ZIP OPSEU footer already gated (`includeOpseuResources`) — left as-is

## Brand Asset Pack swatches (2026-07-30)

- [x] `/assets` colour swatches use `ASSET_PACK_COLORS` from reference seed (`#003DA5` / `#002868`) — not host `BRAND_COLORS` (platform orange) *(reference section only as of 2026-07-31)*
- [x] OPSEU union preset `accentColor` aligned with seed (`#002868`)

## External links audit ticket (2026-07-30) — COMPLETE (core)

- [x] Backlog ticket **`LINK-001`** + [`docs/audit/external-links-audit-plan.md`](audit/external-links-audit-plan.md)
- [x] Agent rules [`.cursor/rules/external-links.mdc`](../.cursor/rules/external-links.mdc)
- [x] Session knowledge [`session-knowledge-2026-07-30.md`](audit/session-knowledge-2026-07-30.md) (upstream national site rot — not UnionOps)
- [x] `opseu-branding` → `https://opseu.org/about/`; `/assets` uses registry; ZIP footer from `getOpseuWebsiteFooterSources()`
- [ ] Optional: lychee CI; steward verify `hub03.opseu.org` seed URLs

## Demo defaults + magic sign-in (2026-07-27) — COMPLETE

- [x] Demo auth on by default in compose; login `demoHint` gated by `NEXT_PUBLIC_DEMO_SITE`
- [x] `db:seed` upserts DEMO_USERS (`demo123`) + `ryan@ryanmorris.ca` platform_admin (unless SEED_* =false)
- [x] Magic sign-in email links + password-reset UX when SMTP/`EMAIL_ENABLED` available
- [x] Migration `0032_sign_in_tokens`

## Auth nav + profile photo (2026-07-27) — COMPLETE

- [x] Main nav shows Officer Hub when logged in (not only when hub is public)
- [x] Sign out in public header / mobile drawer + Hub nav
- [x] `/app/profile` — camera capture or file upload; `GET/PUT/DELETE /api/profile/avatar`
- [x] Durable `users.image` when `AUTH_USERS_BACKEND=postgres` (migration `0031_user_profile_image`)

## Durable invites + seed-admin bootstrap (2026-07-27) — COMPLETE

- [x] Postgres `user_invites` table (migration `0030`) when `AUTH_USERS_BACKEND=postgres`
- [x] Invite create/accept persists; accept upserts `users` (no memory-only invitees on durable hosts)
- [x] `npm run db:seed-admin` — bootstrap first president/admin without public signup
- [x] `docs/guides/POSTGRES_OPS.md` bootstrap + invite flow documented

## Sandbox Postgres flip (2026-07-26) — COMPLETE

- [x] CT 115 `unionops-sandbox` — `docker-compose.durable.yml` + Postgres 16 volume; all migrations + seed
- [x] `docker-web-1` @ `289bfb3`; `/api/health` `postgresFlipComplete: true`
- [x] `HEALTH_REQUIRE_DURABLE=true npm run health:check` green against `192.168.0.115:3000`
- [x] Build fix: raised `BUILD_NODE_HEAP_MB` default; fixed `TimeEntry` drizzle mapping TS errors

## Postgres ops flip tooling (2026-07-26) — COMPLETE

- [x] `/api/health` — all `*_DB_BACKEND` effective flags + `postgresFlipComplete` / `memoryCaseDataActive`
- [x] `docker-compose.durable.yml` overlay flips every module to Postgres after migrate + seed
- [x] `docker/.env.example` + expanded base compose env passthrough for org modules
- [x] `HEALTH_REQUIRE_DURABLE=true` on `npm run health:check` for post-flip verification
- [x] `docs/guides/POSTGRES_OPS.md` — full module table + durable compose workflow

## Time 8f — hybrid slice + punch photos (2026-07-26) — COMPLETE

- [x] Hybrid slice **v1.1** — optional `timeEntries` in export/import when time module enabled; v1.0 slices still accepted
- [x] `timeStore.importLocalSlice()` on memory + Drizzle adapters; `HybridSettingsPanel` time counts (EN/FR)
- [x] Optional punch photo on clock in/out — `savePunchPhoto`, attachment adapter `createForTimeEntry` / `listForTimeEntry`
- [x] API: `GET /api/time/entries/[id]/attachments` + download route; worker dashboard file input
- [x] Migration `0029_time_8f.sql`; unit tests `time-8f.test.ts` + hybrid slice tests
- [x] Punch photos hub-only (not in hybrid exports); `docs/modules/WORKFORCE_TIME.md` + ground-truth updated

## Time 8-full — VeriClock remainder (2026-07-26) — COMPLETE

- [x] Workers directory fields + `GET /api/time/workers?includeInactive=true`
- [x] Standing named groups (`/api/time/groups`); OT policy engine (`/api/time/ot-policies`)
- [x] Shift recurrence (`/api/time/shift-series` + expand); auto-accrual policies (`/api/time/pto/accrual-policies`)
- [x] Payroll export profiles + mapped CSV/webhook (`/api/time/payroll-profiles`, `/api/time/payroll-export`)
- [x] `TimeFullAdminPanel` on `/app/time/admin`; migration `0028_time_full8.sql`; `full8.test.ts`

## Discussions / Tasks social stretch (2026-07-26) — COMPLETE

- [x] Reactions on discussion posts + tasks (`solidarity` / `ack` / `question` toggle APIs)
- [x] @mentions in post/task notes — parse + highlight + in-app mention notifications (`/api/hub/notifications`)
- [x] Lightweight realtime via 15s poll-on-focus (`?since=` on thread + task list); no websockets
- [x] Migration `0027_hub_social` (jsonb reactions/mentions on posts + tasks); memory adapters updated
- [x] EN/FR `hubSocial` + discussions/tasks copy; unit tests `hub-social.test.ts`

## Check-ins + Hub QOL (2026-07-26) — COMPLETE

- [x] HubModule `checkins` — schedules + answers (memory default, `CHECKINS_DB_BACKEND`, migration `0025`)
- [x] Period helper (daily / weekdays / weekly UTC); unanswered `/api/checkins/mine`
- [x] Hub UI `/app/checkins` + detail; `MyCheckinsWidget` on dashboard
- [x] EN/FR; `docs/modules/CHECKINS.md`; hub.a11y smoke; unit tests for periods + access

## Sandbox redeploy (2026-07-26) — COMPLETE

- [x] CT 115 `unionops:local` @ `9446186` (trains #3–#5 on main)
- [x] Health ok (`version` + `mfaEnabled` + `commit`); 137/137 `@smoke` green
- [x] `health-check.mjs` / `smoke-sandbox.mjs` — avoid Windows `AbortSignal.timeout` + `process.exit(0)` UV assert

## Enhancement train #5 — 10 sets (2026-07-26) — COMPLETE

1. `/api/health` `HEAD` support for load balancers
2. Health `mfaEnabled` flag (non-secret)
3. `health-check.mjs` validates `version` field
4. Print guide related links (First week, email, boards) + EN/FR `relatedLabel`
5. Email guide `SourcesBlock` + `PAGE_SOURCE_IDS.emailBroadcast`
6. Brand Kit page link to email & outreach guide
7. FR smoke: footer + Guides menu email outreach
8. Smoke: print guide related email link + health HEAD
9. `.env.example` `HEALTH_URL` + SETUP/ARCHITECTURE health fields
10. PROGRESS + ground-truth updates

## Enhancement train #4 — 10 sets (2026-07-26) — COMPLETE

1. `scripts/health-check.mjs` + `npm run health:check` preflight
2. `test:smoke:sandbox` runs health-check before Playwright
3. `package:sandbox` prints commit sha + `BUILD_COMMIT_SHA` hint
4. `/api/health` adds `version` from package.json
5. POSTGRES_OPS + SETUP + DEPLOY health field docs
6. Website guide smoke — email outreach related link
7. Website guide axe smoke in builders suite
8. First week subtitle mentions optional email (EN/FR) + tertiary label test
9. `ARCHITECTURE.md` ops health endpoint section
10. PROGRESS + ground-truth + roadmap-next updates

## Enhancement train #3 — 10 sets (2026-07-26) — COMPLETE

1. API route auth coverage — password-reset public routes + cron `assertCronSecret` allowlist
2. `/api/health` adds `cronConfigured` (boolean, non-secret)
3. `buildCronDryRunPayload` helper + unit test
4. Email guide cross-links (website, First week)
5. Website guide cross-link to email & outreach
6. Home `pathCommsHint` mentions email (EN/FR)
7. `comms-public-nav.mdc` footer documents email link
8. Smoke: tools channel guides, footer email, Guides menu email
9. `DEPLOY.md` Proxmox sandbox overlay workflow + `.gitignore` tarball
10. PROGRESS + ground-truth + SETUP health field docs

## Enhancement train #2 — 10 sets (2026-07-26) — COMPLETE

1. Home website channel + footer link to email & outreach guide
2. First-week website step tertiary CTA → `/guide/email-broadcast` (EN/FR)
3. `/api/health` smoke test in `e2e/smoke.spec.ts`
4. Email broadcast guide axe smoke in `builders.smoke.spec.ts`
5. Cron `parseCronDryRun` / `parseCronWithinDays` helpers + unit tests
6. `docs/modules/COMMS.md` — fifth-channel email route + v1.2 IA
7. `.env.example` — `BUILD_COMMIT_SHA` + cron `?dryRun=1` docs
8. Tools index channel-guides nav (print, boards, website, email)
9. `npm run package:sandbox` → `scripts/package-sandbox-src.mjs` (git archive tarball)
10. PROGRESS + ground-truth updates

## Enhancement train — 10 sets (2026-07-26) — COMPLETE

1. Canvas placeholder ink constants (`CANVAS_PLACEHOLDER_*`) on QR card/board + action card
2. COMMS email/broadcast guide (`/guide/email-broadcast`) EN/FR + nav + sitemap
3. `/api/health` enriched (`commit`, `backends`, `emailEnabled`)
4. Cron `?dryRun=1` on `/api/cron/meeting-reminders`
5. `themeColor` → `viewport` export (Next.js 16)
6. Operator runbook `docs/guides/POSTGRES_OPS.md`
7. Website template officer location contrast (`mutedInkOnBackground`)
8. `npm run test:smoke:sandbox` script
9. SETUP/DEPLOY operator docs (health, cron dry-run, sandbox smoke)
10. PROGRESS + COMMS_BACKLOG + ground-truth updates

## Canvas muted-ink contrast (2026-07-25) — COMPLETE

- [x] `mutedInkOnBackground()` + `blendHex()` — bump semi-transparent ink alpha when UnionOps orange (#C2410C) fails WCAG AA
- [x] Applied across graphic layouts, QR board/card, action card, board notice, solidarity poster, meeting backgrounds, website template footer CSS
- [x] Unit + builders smoke a11y (16/16) green
- [x] Follow-up: quote-card footer on primary, website copyright, action-card QR placeholder

## Time 8d-lite + 8e GPS + Graphic Maker invite (2026-07-24) — COMPLETE

- [x] 8d-lite: weekly OT flag on CSV export + pay-period snap helper (`pay-period.ts`)
- [x] 8e: `gpsConsentAt` on workers + `/api/time/workers/consent-gps` + worker UI
- [x] Graphic Maker notice layout: `InviteEmailPanel` (R0.5 stretch)
- [x] Migration `0023_time_gps_consent.sql`; EN/FR; unit tests

## Cron officer meeting reminders (2026-07-24) — COMPLETE

- [x] `GET|POST /api/cron/meeting-reminders` gated by `CRON_SECRET`
- [x] Officer roster emails only for Hub events in window; ADR-016 no member lists
- [x] Helpers + unit tests; SETUP + `.env.example` docs

## Time 8c.3 — PTO accrual balances (2026-07-24) — COMPLETE

- [x] `PtoBalance` types + adapter (memory + Drizzle); approve debit when `hoursRequested` set
- [x] `GET/POST /api/time/pto/balances` (admin set/adjust)
- [x] Balances on `PtoRequestsPanel`; migration `0022_pto_balances.sql`; EN/FR; unit test
- [ ] Auto-accrual formulas (deferred)

## Cron officer meeting reminders (2026-07-24) — COMPLETE

- [x] `GET|POST /api/cron/meeting-reminders` gated by `CRON_SECRET`
- [x] Officer roster emails only for Hub events in window; ADR-016 no member lists
- [x] Helpers + unit tests; SETUP + `.env.example` docs

## Time 8c.2 — Shift scheduling (2026-07-24) — COMPLETE

- [x] `TimeShift` types + adapter methods (memory + Drizzle)
- [x] `GET/POST /api/time/shifts`, `PATCH /api/time/shifts/[id]` with RBAC + audit
- [x] Admin + worker `ShiftSchedulePanel`; optional `shiftId` on clock-in
- [x] Migration `0021_time_shifts.sql` + `time_entries.shift_id`; EN/FR; unit tests
- [x] Docs: WORKFORCE_TIME, time-module, ground-truth / roadmap-next
- [ ] Recurrence / auto-timesheet / PTO accrual (deferred)

## Time 8c.1 — PTO leave requests (2026-07-24) — COMPLETE

- [x] `PtoRequest` types + adapter methods (memory + Drizzle)
- [x] `GET/POST /api/time/pto`, `PATCH /api/time/pto/[id]` with RBAC + audit
- [x] Worker request form + admin queue (`PtoRequestsPanel` on Time dashboards)
- [x] Migration `0020_pto_requests.sql` + RLS; EN/FR; unit tests
- [x] Docs: `WORKFORCE_TIME.md`, `time-module.mdc`, ground-truth / roadmap-next
- [ ] Accrual balances / scheduling (deferred to 8c.2+)

## Password-reset (2026-07-24) — COMPLETE

- [x] Memory reset tokens (`password-reset.ts`) + persist for Postgres users / memory invitees (demo roster excluded)
- [x] `POST /api/auth/forgot-password` (no email enumeration) + `GET/POST /api/auth/reset-password/[token]`
- [x] Public Hub pages `/app/forgot-password`, `/app/reset-password/[token]`; login link; proxy allowlist
- [x] Transactional email copy via existing SMTP helper; EN/FR i18n; unit tests
- [x] Docs: `current-ground-truth.md`, `roadmap-next.mdc`

## Durable Postgres password-reset tokens (2026-07-25) — COMPLETE

- [x] `password_reset_tokens` table (migration `0024`) + Drizzle schema — no RLS (public token lookup, like `users`)
- [x] Adapter factory: memory default; Postgres when `AUTH_USERS_BACKEND=postgres` (+ `DATABASE_URL`)
- [x] Async facade (`create` / `get` / `consume`); routes await; prior unused tokens invalidated per email
- [x] Unit tests + `.env.example` / SETUP / ground-truth / roadmap-next updated

## First week Print step + copy sweep (2026-07-24) — COMPLETE

- [x] Print step on `/guide/social-media-plan` after boards / before socials (`FIRST_WEEK_STEP_KEYS` → Flyer Maker + Print Guide)
- [x] EN/FR roadmap, Resources checklist/explore, Blueprint, Website Guide, Examples, workshop run sheets: “Social Media Plan” → “First week”
- [x] Unit tests for step order + EN/FR step parity; `COMMS_BACKLOG.md` / `COMMS.md` / roadmap-next / ground-truth updated

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
- [x] Demo user: `stability.243@unionops.test`
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
- [ ] Workforce Time **8c+** (scheduling, PTO, OT) → **Phase 8** (8-lite + 8-lite+ + 8a + **8b** shipped 2026-07-24)
- [x] Comms First week Print step + “Social Media Plan” → “First week” copy sweep → [`docs/modules/COMMS_BACKLOG.md`](modules/COMMS_BACKLOG.md)
- [x] Comms content backlog (email/broadcast guide) → [`docs/modules/COMMS_BACKLOG.md`](modules/COMMS_BACKLOG.md)
- [x] Printable seniority worksheet + right-to-refuse pocket card (FUTURE-003/004 stretch) → Document Generator + QR Link Card presets (2026-07-26)
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

## Landing page — align + desktop layout (2026-07-14) — v1 COMPLETE; composition v2 COMPLETE (2026-08-12)

- [x] Hero band with CTAs + trust aside (`lg` split); Share/privacy secondary
- [x] Hub-off: compact coming-soon rail (not a twin dashed card)
- [x] Brand Kit sticky rail + `/assets` / Logo Builder links
- [x] Toolbox: boards → print → social → website; capped tiles; `xl:grid-cols-4`
- [x] Closing CTAs: Get started / Resources / Blueprint; home-enter motion; EN/FR copy
- [x] **v2:** two-zone hero at `lg+` (`HomeHeroPreview`); `COPY-001` path CTA de-dup

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
- [x] **R0.5 (shipped):** matching invite-email on Board Notice / printables — `InviteEmailPanel` + `event-email-from-notice.ts`; plan `.cursor/plans/hybrid_lec_rsvp_outreach.plan.md`

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
- [x] FUTURE-003/004 stretch (2026-07-26) — printable seniority worksheet (`document-generator?preset=seniority-worksheet`) + right-to-refuse pocket card (`qr-card?preset=rightToRefuse`); Hub case detail guide + worksheet links
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
- [x] `UI-006` — Hub polish follow-on: mobile card stacks for audit/officers/ledger; stacked CTAs on handoff + org boards (elections/travel/polls/minutes); `@mobile` overflow for audit/handoff/officers/minutes
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
- [x] `ORG-009` — union business & purchase expense submissions (`ExpenseSubmission`, memory + optional `EXPENSES_DB_BACKEND=postgres`, migration `0026_expense_submissions` + RLS); draft → submit → treasurer approve/deny; ledger post on approve; receipt attachments (`AttachmentMeta.expenseSubmissionId`); `/api/expenses/**`; Hub `/app/expenses`; PDF/XLSX + receipt ZIP export; EN/FR + HubNav
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

## Agent knowledge capture (2026-07-24 / 2026-07-25)

- [x] [`docs/audit/current-ground-truth.md`](audit/current-ground-truth.md) — as-built through Time 8e + cron + GM invite
- [x] [`docs/audit/session-knowledge-2026-07-24.md`](audit/session-knowledge-2026-07-24.md) — Hub MFA / Proxmox / password-reset / autonomous feature train (#4–#10) lessons
- [x] Refresh `roadmap-next.mdc`, `time-module.mdc`, and related rules so stale “next” claims do not mislead agents
- [x] Autonomous train merged: PRs #5–#10 (password-reset, Time 8c.1–8e, cron, GM invite)

## Extra edge clearance — wallpapers + meeting backgrounds (2026-08-12)

- [x] Shared `edge-clearance.ts` profiles inset type/chrome (not the brand field) so taskbars, notches, and Zoom/Teams cover-fit crop empty colour
- [x] Meeting Backgrounds: toggle default on; Solidarity Poster: Digital on / Print off; Resizer overlay extracted to `CanvasSafeZoneOverlay` (preview-only)
- [x] EN/FR copy + dashed preview overlay outside `canvasRef`; related-tools link between the two digital tools
