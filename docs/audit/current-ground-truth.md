# Current ground truth (agents) — as of 2026-09-27

**Enterprise hosted-readiness work (2026-09-27):** [`../LAUNCH_TRUST_LEGAL_REFACTOR.md`](../LAUNCH_TRUST_LEGAL_REFACTOR.md) is the active packet tracker. The initial [`data-inventory-retention-register.md`](data-inventory-retention-register.md) maps data classes and storage/lifecycle gaps from local source. It is not an approved retention schedule: no customer purge or legal-hold service is evidenced, and the checked-in backend flags do not prove production host configuration. The dated 2026-08-24 Portal audit has a 2026-09-27 revalidation addendum; the hosted Portal MFA boundary is documented in [`session-knowledge-2026-09-27-portal-mfa-guard.md`](session-knowledge-2026-09-27-portal-mfa-guard.md). Do not use real sensitive imports until retention, deletion, storage, and host controls are verified.

**Union/local provisioning step-up (2026-09-27):** [`session-knowledge-2026-09-27-tenant-provision-step-up.md`](session-knowledge-2026-09-27-tenant-provision-step-up.md) — Site Admin creation APIs, `/api/tenant` onboarding union creation, and the `newUnionName` branch of `/api/invites` require fresh MFA and correlated authorization/result audit when host policy enables MFA; hosted mode requires durable audit, and onboarding/invite paths also require durable tenant storage. Invite uncertainty responses withhold tokens and block blind UI retries. Tests are authored but Vitest, TypeScript, browser, and deployed database evidence remain pending.
**Hub document-vault file step-up (2026-09-27):** [`session-knowledge-2026-09-27-document-file-step-up.md`](session-knowledge-2026-09-27-document-file-step-up.md) — legacy Hub Local Documents file downloads now require fresh MFA, an authorization audit before storage reads, and a confirmed result audit before bytes are returned; direct GET is retired. Deletion requires fresh MFA and correlated before/after evidence, with uncertain states blocking UI retry. Hosted mode requires Postgres-backed document metadata and audit. This is distinct from Managed Documents. The current checkout lacks that source, but local ref `origin/feat/managed-document-library` contains it; the source audit records integration conflicts and gaps. Vitest, typecheck, browser, storage-provider, and deployed Postgres/RLS/TOTP/audit evidence remain pending.
**Attachment download audit (2026-09-27):** [`session-knowledge-2026-09-27-casework-attachment-audit.md`](session-knowledge-2026-09-27-casework-attachment-audit.md) — grievance, bumping, time-entry, and explicitly shared member Portal routes now append correlated authorization evidence before reading attachment bytes and delivery evidence before returning them. Hosted customer mode requires Postgres metadata and audit; time photos also require Postgres time data. No fresh challenge was added so basic members retain permitted access. Route cases are authored; Vitest, target-host RLS, storage, and audit evidence remain pending.

**Hosted TOTP replay protection (2026-09-27):** [`session-knowledge-2026-09-27-totp-replay.md`](session-knowledge-2026-09-27-totp-replay.md) — migration `0067` stores the latest accepted TOTP counter per account with RLS and atomic compare-and-advance. Source behavior and tests are present; generated-shape, deployed migration, and live `unionops_app` RLS proof remain pending.

**Hosted MFA session grants (2026-09-27):** [`session-knowledge-2026-09-27-mfa-grants.md`](session-knowledge-2026-09-27-mfa-grants.md) — migration `0068` stores a single hashed grant per account and consumes it atomically in the Auth.js JWT update path. Source evidence is present; deployed RLS and multi-replica verification remain pending. Pending enrollment is still process-local.

**Hosted MFA attempt limit (2026-09-27):** [`session-knowledge-2026-09-27-mfa-attempt-limit.md`](session-knowledge-2026-09-27-mfa-attempt-limit.md) — migration `0069` adds an account-scoped 10-attempt/15-minute shared window for MFA verification, including recovery codes and the shared incident challenge verifier. Hosted mode requires durable Postgres; deployed RLS/concurrency evidence and owner review of the internal threshold remain pending.

**Security audit outcome/correlation fields (2026-09-27):** [`session-knowledge-2026-09-27-security-audit-fields.md`](session-knowledge-2026-09-27-security-audit-fields.md) — migration `0070` adds `outcome` and `request_id`, marks historical outcomes unknown, and removes runtime update/delete privileges. MFA and audit-list routes now emit server-generated request IDs. Broad route coverage and deployed Postgres/RLS evidence remain open.

**Site Admin role-change step-up (2026-09-27):** [`session-knowledge-2026-09-27-role-change-step-up.md`](session-knowledge-2026-09-27-role-change-step-up.md) — the platform Hub-role API requires a fresh MFA challenge when MFA is enabled and fails closed in hosted customer mode without production TOTP; the same request ID correlates audited outcomes. Other sensitive actions and deployed verification remain open.

**Tenant authority-change step-up (2026-09-27):** [`session-knowledge-2026-09-27-org-authority-step-up.md`](session-knowledge-2026-09-27-org-authority-step-up.md) — officer assignment/revocation and delegation grant/revocation APIs require a fresh challenge after tenant authorization and before their write transaction when MFA is enabled. The organization form resumes a pending change after verification. Direct API denial, throttling, and successful audit correlation cases are present; other actions, full test execution, audit transactionality, and deployed RLS evidence remain open.

**UnionOps Data publication step-up (2026-09-27):** [`session-knowledge-2026-09-27-data-publish-step-up.md`](session-knowledge-2026-09-27-data-publish-step-up.md) — the accepted-row publication API now requires a fresh MFA challenge after local writer authorization and before `publishImport`. Denial/success are correlated; the UI resumes publication and reports a post-commit audit failure accurately. Data module storage, scanning, retention, and P0 review gaps still block a real member-data pilot.

**Sensitive expense export step-up (2026-09-27):** [`session-knowledge-2026-09-27-expense-export-step-up.md`](session-knowledge-2026-09-27-expense-export-step-up.md) — spreadsheet, PDF, and receipt ZIP exports now use POST, validate tenant access before fresh MFA, and require a confirmed success audit before returning bytes. The old GET path is closed; denial/success responses are correlated and non-cacheable. Focused route coverage was added, while Vitest and production audit/RLS verification remain unavailable.

**Poll response export step-up (2026-09-27):** [`session-knowledge-2026-09-27-poll-export-step-up.md`](session-knowledge-2026-09-27-poll-export-step-up.md) — CSV/XLSX results use POST and require fresh MFA after union/local scope validation but before aggregate or free-text response reads. Correlated audit must succeed before bytes are returned; the legacy GET path returns 405. Focused route and API integration coverage is authored; Vitest, browser verification, and hosted audit/TOTP/RLS evidence remain pending.

**Meeting RSVP export step-up (2026-09-27):** [`session-knowledge-2026-09-27-rsvp-export-step-up.md`](session-knowledge-2026-09-27-rsvp-export-step-up.md) — RSVP CSV exports use POST and require fresh MFA after meeting union/local scope checks but before attendee names, contact details, or notes are read. Correlated audit must succeed before bytes are returned; the legacy GET path returns 405. Focused route coverage and a localized challenge/resume form are authored; Vitest, browser, and hosted audit/TOTP/RLS evidence remain pending.

**Site Admin password-reset step-up (2026-09-27):** [`session-knowledge-2026-09-27-password-reset-step-up.md`](session-knowledge-2026-09-27-password-reset-step-up.md) — forced reset emails now require fresh MFA under host policy and audit intent before issuing/sending the token. The operator response and audit metadata no longer expose the reset token or target email. Failed result evidence returns an uncertain-delivery warning; focused tests and UI are authored, with Vitest and hosted evidence pending.

**Site Admin account-assignment step-up (2026-09-27):** [`session-knowledge-2026-09-27-site-admin-assignment-step-up.md`](session-knowledge-2026-09-27-site-admin-assignment-step-up.md) — union/local membership reassignment now requires fresh MFA. A correlated authorization audit must append before the database helper; uncertain result evidence after the write blocks blind retry in the UI. Focused API tests and bilingual challenge states are authored; Vitest and deployed Postgres/RLS/TOTP/audit evidence remain pending.

**Site Admin local archive/restore step-up (2026-09-27):** [`session-knowledge-2026-09-27-local-lifecycle-step-up.md`](session-knowledge-2026-09-27-local-lifecycle-step-up.md) — both lifecycle routes challenge before local lookup, require a correlated authorization event before mutation, and append a union-scoped result event. The bilingual UI resumes the exact action and blocks retry when write/result evidence is uncertain, with a reload-to-inspect control. Direct tests are authored but runtime, browser, and deployed Postgres/RLS/TOTP/audit verification remain pending.

**Site Admin membership-policy step-up (2026-09-27):** [`session-knowledge-2026-09-27-membership-policy-step-up.md`](session-knowledge-2026-09-27-membership-policy-step-up.md) — the union membership-policy PATCH validates first, then requires fresh MFA before union and member-impact reads. Correlated intent audit precedes the scoped aggregate/write and result audit follows. The EN/FR form preserves the policy during challenge and blocks retries after uncertain results. Direct tests are authored but Vitest, TypeScript, browser, and deployed RLS/TOTP/audit evidence remain pending.

**Site Admin cross-tenant audit-read step-up (2026-09-27):** [`session-knowledge-2026-09-27-site-admin-audit-step-up.md`](session-knowledge-2026-09-27-site-admin-audit-step-up.md) — the host-wide action log now uses POST, requires fresh MFA before querying, and requires correlated intent/result audit before returning entries. GET is retired. EN/FR challenge/error UI and direct route cases are authored; Vitest, browser, owner-DB least-privilege, and deployed RLS/audit verification remain pending.

**Payroll export step-up (2026-09-27):** [`session-knowledge-2026-09-27-payroll-export-step-up.md`](session-knowledge-2026-09-27-payroll-export-step-up.md) — when host MFA policy is enabled, the time payroll endpoint requires fresh MFA after local payroll-profile authorization and before approved rows are read or sent to an optional webhook. A pre-dispatch audit is required; the post-dispatch event is correlated, and the route warns against blind retry if that result audit fails. Focused route cases and a bilingual action-confirmation form are present; Vitest and deployed webhook/audit/RLS evidence remain unavailable.

**Hosted operating readiness (2026-09-27):** [`session-knowledge-2026-09-27-host-readiness.md`](session-knowledge-2026-09-27-host-readiness.md) — UnionOps-operated customer readiness now checks explicit/reviewed attachment storage, strict upload scan configuration, and owner/date attestations for backup restore and alert delivery. The 90-day evidence age is a provisional internal target. Public health omits these operational fields; a dedicated bearer secret returns pass/fail booleans to operators/CI. App checks and attestations do not replace target-host provider, restore, or delivery evidence. Subprocessor inventory remains pending actual deployment inspection.

**Public discovery (2026-09-21):** [`session-knowledge-2026-09-20-task-first-public-site.md`](session-knowledge-2026-09-20-task-first-public-site.md) — explicit Start / Brand Kit / Create / Learn / session-aware Officer Hub links (wordmark returns Home), numbered setup sequence, shared catalog and canonical route migration, item deliverables/privacy disclosures, local-only guided paths, and bilingual browser search. Remaining validation: content-owner review of rough time estimates, in-context French copy review, assistive-technology testing, and moderated task research without analytics.

**Hub governance casework (2026-09-20):** [`session-knowledge-2026-09-20-hub-bylaws-proposals.md`](session-knowledge-2026-09-20-hub-bylaws-proposals.md) + [`docs/modules/BYLAWS_PROPOSALS.md`](../modules/BYLAWS_PROPOSALS.md) — `/app/bylaws` (draft lifecycle + generated preview), `/app/proposals` casework (rows, caucus note, activity timeline, publish), `/portal/proposals` member-safe published feed, Drizzle adapters behind `BYLAWS_DB_BACKEND`/`PROPOSALS_DB_BACKEND`. Public tools stay on-device; `HubDraftSyncPanel` pushes a copy when signed in. Member-safe rule: publications never carry counters, caucus notes, or employer language.

**Verified DB deployment gate (2026-09-20):** [`session-knowledge-2026-09-20-verified-db-deploy.md`](session-knowledge-2026-09-20-verified-db-deploy.md) + [ADR-020](adr-020-database-deployment-contract.md) supersede the 2026-09-15/16 maintainer design. There is one authority: the append-only Drizzle journal. Boot validates it, serializes replicas, migrates with the owner URL, proves the exact schema-qualified tail, verifies generated table/column/role/RLS/policy shape, then serves; otherwise exit 1. `platform_meta`, the separate data-migration pointer, boot-commit DDL state, and health-only schema probe are retired. CapRover Method 3 + GHCR is the production contract.

**UnionOps Data import/lifecycle foundation (2026-09-20):** [`session-knowledge-2026-09-20-unionops-data.md`](session-knowledge-2026-09-20-unionops-data.md) + [`docs/modules/DATA_WORKBENCH.md`](../modules/DATA_WORKBENCH.md) — local-scoped, officer-only CSV/XLSX staging and member/employment history foundation. Upload processing is synchronous, Records still exposes raw JSON, and Reports is a placeholder; the note records lessons, ranked UX gaps, and a synthetic pilot walkthrough. Do not enable real member-data imports until the listed processing, retention, and review UX gaps are closed.

**Site design system uplift (2026-09-16):** [`session-knowledge-2026-09-16-design-uplift.md`](session-knowledge-2026-09-16-design-uplift.md) — public site pages now share one grammar (Card variants / Eyebrow / SectionHeading / IconChip / ButtonLink). Read `.cursor/rules/site-design-system.mdc` before editing any `src/app/[locale]/**/page.tsx`.

**Historical schema lesson (2026-09-16):** [`session-knowledge-2026-09-16-db-maintain-drizzle-schema.md`](session-knowledge-2026-09-16-db-maintain-drizzle-schema.md) records why bare `__drizzle_migrations` queries fail. ADR-020 retains the lesson but replaces that runner: discover through `information_schema`, reject ambiguity, and explicitly schema-qualify all ledger access. postgres.js 3.4 requires a no-op `onnotice` callback for actual silence despite documenting `false`.

**CapRover app-level config drift (2026-09-16):** [`session-knowledge-2026-09-16-caprover-app-config-drift.md`](session-knowledge-2026-09-16-caprover-app-config-drift.md) — unionops app's **Deployment Method = Method 1 (git webhook)** runs `docker build` on the droplet on every push, OOM-SIGKILLing `RUN npm run build` regardless of PR #88's CI-level harden. CI now also verifies `ghcr.io/...:main` matches the `:sha-<7>` tag pushed in the same job. **Operator action:** flip CapRover app to **Method 3: Use Docker Image** with image `ghcr.io/hackmods/union-communications:main`; once flipped, the webhook path is dead. **Escape hatch (this PR):** `ci.yml` `workflow_dispatch` inputs `image_tag` + `skip_smoke` let the operator ship a pre-published GHCR image from the GH UI without waiting for the webhook rebuild to OOM again — `docker-image` job is skipped on dispatch and `deploy` validates the chosen tag before invoking `caprover-cli`. Post-deploy `/api/health` smoke verifies `.commit` matches the dispatched SHA. Cursor rule: `.cursor/rules/caprover-docker.mdc` "CapRover deploy preference" §4.

**Purpose:** Replace stale claims in the 2026-07-22 audit snapshot (`active-context.md`, older roadmap-next bullets). Prefer this file + `docs/PROGRESS.md` + module specs when sequencing work.

**Operator error sinks / Sentry (2026-09-08):** [`session-knowledge-2026-09-08-sentry-observability.md`](session-knowledge-2026-09-08-sentry-observability.md) + [`docs/modules/OBSERVABILITY.md`](../modules/OBSERVABILITY.md) — CapRover env toggles for Sentry (errors-only, tunnel `/monitoring`) and/or server JSONL with rotation. Not product analytics (ADR-006 amendment). Verify with `GET /api/health` → `observability`. Do not open CSP to ingest hosts or enable Session Replay.

**How Canadian unions connect (2026-09-05):** `/guide/union-history` is a gold labour playbook (not mega-menu). Affiliation is two tracks, not one ladder: union family vs geographic house. OPSEU / SEFPO Local 243 is the worked example. Niagara Area Council is OPSEU-internal; NRLC is the multi-union labour council. Printable affiliation-map PDF on Map your local. External URLs live in `comms-sources.ts` only.

**Strike operations vs crisis comms (2026-09-05):** [`session-knowledge-2026-09-05-strike-operations.md`](session-knowledge-2026-09-05-strike-operations.md) — `/guide/strike` is the operations playbook (kits, gate coverage, captain training, line, membership, money, safety, return). `/guide/crisis` is Crisis Comms (who may speak). Do not label crisis as “Strike Guide” or restore a three-posts-a-day quota. Bargaining lifecycle stays the legal clock. Cover-every-door tactics are lawful picket coverage, not a blockade manual.

**Running meetings / Rules of Order (2026-08-28):** [`session-knowledge-2026-08-28-running-meetings-rules-of-order.md`](session-knowledge-2026-08-28-running-meetings-rules-of-order.md) — public `/guide/running-meetings` (quorum, precedence, debate, voting, worked GMM) + `/tools/rules-of-order` (14 actions, copy phrase). Not Hub `/app/meetings` (calendar/RSVP). Pocket PDF via OL module 4 helper. Discoverability: `guide-registry.ts` labour group + steward playbooks.

**Officer Learning chrome + Guides nav (2026-08-28 / colour align 2026-09-20):** [`session-knowledge-2026-09-20-officer-learning-site-colours.md`](session-knowledge-2026-09-20-officer-learning-site-colours.md) supersedes the navy default. OL uses a **single platform light palette** (`olTheme` = `bg-background` + `opseu-blue` / `opseu-dark`); `officerLearningColour` Display setting retired. ModuleViewer shell stays (not GuideLayout). Guides ▾ five groups + `guide-registry.ts` job groups unchanged.

**Grievance process guide (2026-08-26):** Public `/guide/grievance-process` is a how-to-run-a-file playbook (forum gate, teaching 6 W's, CA clocks, CA-named steps as jobs, worked file, failure modes) plus Document Generator `grievance-intake` worksheet. Not legal advice. Officer Hub `/app/grievances` is the tracker (there is no separate “Case Tracker” product). Discoverability is Blueprint labour strip + Resources labour playbooks, not the main Guides menu. **Next (not this pass):** structured 6 W's on Hub New Grievance — see [`docs/modules/GRIEVANCE.md`](../modules/GRIEVANCE.md).

**Joint committees / EERC fit-gap (2026-08-23):** [`session-knowledge-2026-08-23-eerc-committees.md`](session-knowledge-2026-08-23-eerc-committees.md) — PT/FT EERC is a provincial joint union–employer body. Hub `/app/committees` is a local internal roster. Do not add an OPSEU-named module or host official joint minutes. Public guide: `/guide/joint-committee`. Portal invited Circles may omit `localId` (`scope: "union"`). Public Comms (letterhead, flyers, email-broadcast) and local UCC remain the other usable pieces.

**Org Chart (2026-08-20):** [`session-knowledge-2026-08-20-org-chart.md`](session-knowledge-2026-08-20-org-chart.md) — `/tools/org-chart` is a public on-device officers/stewards poster + JSON/CSV. It hydrates Website Template. Do not pull Hub `/app/officers` or call it a member list. Lives under Union boards, not a fifth Tools column.

**Session narrative + lessons (Hub → Proxmox → password-reset → Time 8c–8e → cron → GM invite):** [`session-knowledge-2026-07-24.md`](session-knowledge-2026-07-24.md)  
**Comms external links / national site URL rot (LINK-001):** [`session-knowledge-2026-07-30.md`](session-knowledge-2026-07-30.md)  
**Multi-union sources + logo bundling (LINK-002):** [`session-knowledge-2026-07-30-multi-union-sources.md`](session-knowledge-2026-07-30-multi-union-sources.md)  
**Local 404 / route status chrome:** [`session-knowledge-2026-08-09-local-404.md`](session-knowledge-2026-08-09-local-404.md)  
**Workshop Comms multiphase + Gap Fit (talk ~2026-08-12):** [`session-knowledge-2026-08-09-workshop-comms.md`](session-knowledge-2026-08-09-workshop-comms.md), [`workshop-gap-fit-2026-08.md`](workshop-gap-fit-2026-08.md)
**Flyer Maker QOL v2 + unified tools chrome / Share Kit v0 (2026-08-14):** [`session-knowledge-2026-08-14-flyer-unified-tools.md`](session-knowledge-2026-08-14-flyer-unified-tools.md)
**QR Board canvas QOL + layout-class CI matrix + wallet FitWidth (2026-08-17):** [`session-knowledge-2026-08-17-qr-canvas-layout.md`](session-knowledge-2026-08-17-qr-canvas-layout.md) (lessons B1–B14, residual gaps, optional next steps), checklist [`plan-2026-08-17-qr-board-canvas-qol.md`](plan-2026-08-17-qr-board-canvas-qol.md)
**Tools catalog regrouping (2026-08-18):** [`session-knowledge-2026-08-18-tools-catalog-ia.md`](session-knowledge-2026-08-18-tools-catalog-ia.md) — Tools ▾ / `/tools` columns are jobs (Brand / Union boards / Print & cards / Social & web), not a 1:1 of First week channels  
**Website Template CMS export (2026-08-18):** [`plan-2026-08-18-website-export-wp-squarespace.md`](plan-2026-08-18-website-export-wp-squarespace.md), [`session-knowledge-2026-08-18-website-export.md`](session-knowledge-2026-08-18-website-export.md) — GitHub Pages ZIP is default; optional classic WP theme ZIP (UnionOps does **not** support WordPress). **Squarespace 7.1 theme export is a non-option**. Steward copy on `/guide/website` and `/tools/website-template`. Do not advertise a Squarespace template.  
**Share Kit folded (2026-08-18):** `/tools/share-kit` redirects to Graphic Maker. Presets + Captions/Resizer related links cover the old orchestrator. Do not rebuild a third social canvas.  
**Short-form video (2026-08-18):** [`session-knowledge-2026-08-18-short-form-video.md`](session-knowledge-2026-08-18-short-form-video.md) — `/guide/short-form` is channel practice, not a Video Hub. Graphic Maker `portrait` 9:16 stills + `reel-picket` example. Do not add an in-browser editor or platform embeds.  
**Multi-union Hub signup + platform admin (2026-08-18):** [`session-knowledge-2026-08-18-multi-union-hub-signup.md`](session-knowledge-2026-08-18-multi-union-hub-signup.md) — public Comms presets ≠ Hub tenancy; Hub is invite-only; `platform_admin` is seeded (`ryan@ryanmorris.ca`) not a demo login. Do not add `/app/register` without a product decision.  
**President soft launch (2026-08-19):** [`session-knowledge-2026-08-19-president-soft-launch.md`](session-knowledge-2026-08-19-president-soft-launch.md) — operator invites a president by local number; they set up Hall and invite officers/members while Hub stays unadvertised. Overlay hydrates on Hub/Portal layout; chrome uses session `localId` (not seed 243). President first login can honor `?next=/app/onboarding`. Hall roster rebuilds from users on Together.
**Comms stay free / hosted Hub cost (2026-08-19):** [`session-knowledge-2026-08-19-comms-stay-free.md`](session-knowledge-2026-08-19-comms-stay-free.md), ADR-019 — public Comms stay free; UnionOps-hosted Officer Hub / Local Portal recovers hosting cost; self-host stays an option. Do not restore “free forever” as a whole-platform promise.
**Local Portal solidarity names (2026-08-19):** [`session-knowledge-2026-08-19-portal-solidarity-names.md`](session-knowledge-2026-08-19-portal-solidarity-names.md) — Together / Hold the line / One fight / Many hands. Not a Basecamp parody and not a shop-floor glossary. Do not restore Station / Fronts / Momentum / Pipeline or Locker / On the table / The push / Shop board as UI titles. Committee Circles show empty extras so officers can start Many hands / One fight / Roll Call; Hall still hides those until they have data.

## Do not re-open as if missing

| Topic | Reality | Why it mattered |
|-------|---------|-----------------|
| Audit sprint Phases 1–4 | Closed | Security, Postgres adapters (flagged), FEAT/ORG/TOOL/UX tickets shipped |
| Postgres adapters | Exist behind `*_DB_BACKEND` (default **memory**) | Ops flip per host; durable invites + `db:seed-admin` when `AUTH_USERS_BACKEND=postgres` |
| Calendar R0 / R0.5 / R1 / R2 / R3 | Shipped (cron **member** auto-send deferred) | R2 = Hub copy draft; R3 = SMTP self-remind |
| Cron officer reminders | Shipped 2026-07-25 | `/api/cron/meeting-reminders` + `CRON_SECRET`; roster emails only |
| Time 8a–8b | Shipped | Postgres flag; sites/geofence; bulk approve; XLSX/PDF |
| Time 8c.1–8c.3 | Shipped 2026-07-24/25 | PTO requests; shifts; accrual balances |
| Time 8d-lite / 8e | Shipped 2026-07-25 | Weekly OT CSV flag; pay-period snap; GPS consent |
| Time 8-full | Shipped 2026-07-26 | Workers directory, OT policies, shift recurrence, auto-accrual, groups, payroll hooks |
| Time 8f | Shipped 2026-07-26 | Hybrid slice v1.1 time entries; punch photo attachments |
| Graphic Maker notice invite | Shipped 2026-07-25 | `InviteEmailPanel` on notice layout (R0.5 stretch) |
| Pristine Office Templates | Shipped 2026-07-15 | Plan file todos may look pending — trust PROGRESS |
| Password-reset | Shipped | Memory default; durable Postgres when `AUTH_USERS_BACKEND=postgres` |
| FEAT-003 / FEAT-004 | Shipped | Related tasks panel; outcome UI/export/`appealDays` |
| Check-ins (Basecamp Automatic Check-ins) | Shipped 2026-07-26 | HubModule `checkins`; dashboard unanswered widget; no email nudges |
| Local 404 / route status | Shipped 2026-08-09 | `RouteStatusPanel`; Portal + root/`global-error`; poll/RSVP/meeting `notFound()`; quips + eggs |
| Workshop Demo Path + multiphase UX | Shipped 2026-08-08/09 | `WorkshopDemoPath`; `/guide/workshop`; Day-of run sheet; exportSuccess / RelatedTools / BrandSetup; Gap Fit backlog |
| Brand Kit union presets (CUPE/Unifor/…) | Shipped — **Comms only** | Not Officer Hub tenant signup. Hub stays invite-only. `create_union` / `create_local` persist to Postgres when `DATABASE_URL` is set; overlay is the memory fallback. See session-knowledge president soft launch |
| Whole-platform “free forever” | **Rejected 2026-08-19** | Comms stay free; hosted Officer Hub / Local Portal may recover hosting costs. `/manifesto` + ADR-019 |
| OPSEU EERC Hub module | **Not a gap to build** | Provincial joint committee. Use Comms + local UCC; see [`session-knowledge-2026-08-23-eerc-committees.md`](session-knowledge-2026-08-23-eerc-committees.md). Do not host official minutes or name a core module EERC. |
| Running meetings playbook + cheat sheet | Shipped 2026-08-28 | `/guide/running-meetings` + `/tools/rules-of-order`; Robert's reference only — confirm local bylaws |
| Guide discoverability registry | Shipped 2026-08-28 | `src/lib/comms/guide-registry.ts` — do not duplicate path arrays on Blueprint/Resources/playbooks |
| CapRover Sentry + JSONL sinks | Shipped 2026-09-08 | Env-gated; tunnel `/monitoring`; see OBSERVABILITY module — not analytics |
| Hub bylaws + proposals casework | Shipped 2026-09-20 | `/app/bylaws`, `/app/proposals`, `/portal/proposals`; on-device tools stay first; see `BYLAWS_PROPOSALS.md` |

## Three email/reminder surfaces (do not conflate)

| Surface | Where | Send model |
|---------|-------|------------|
| Public RSVP **invite** | Document Generator, Board Notice, Graphic Maker notice | Copy / `mailto:` — `event-email.ts` |
| Hub **officer reminder draft** (R2) | `/app/meetings` Events board | Copy / `mailto:` — `membership-meeting-reminder.ts` |
| Hub **SMTP** (R3 + cron) | `remind-email` + `/api/cron/meeting-reminders` | Opt-in `EMAIL_ENABLED`; officer session or **roster** emails only |

Never member broadcast lists. Never put public invite copy on grievance email-draft APIs.

## Time Phase 8 slicing (locked)

- **8b:** sites/geofence, bulk approve, XLSX/PDF
- **8c.1:** leave requests — **8c.2:** shifts (no recurrence) — **8c.3:** manual accrual + approve debit
- **8d-lite:** weekly OT flag on CSV + 14-day pay-period snap — **not** full OT engine
- **8e:** `gpsConsentAt` + punch GPS gated on consent
- **8-full:** workers directory, OT policy engine, shift recurrence, auto-accrual, named groups, payroll export hooks
- **8f:** hybrid slice v1.1 includes time entries; optional punch photo attachments (hub storage only)

## Hub / auth / ops gotchas

| Topic | Reality |
|-------|---------|
| MFA-off Hub | `useSessionMfaOk()` / `MfaPolicyProvider` — not raw `mfaVerified` |
| Memory demo FT/PT | Distinct PT seeds (grev-002 + additional-hours log/snippet/check-in/task/discussion). Collection is a list filter; steward isolation is assignment. Bumping stays FT. |
| Demo on prod image | Login hint is build-time `NEXT_PUBLIC_DEMO_SITE`. Roster login needs that flag **inlined** in `isDemoAuthEnabled` or runtime `AUTH_ALLOW_DEMO_USERS=true`. Image runner now defaults both. Health: `demoAuthEnabled`. |
| Demo emails | Reserved `unionops.test` (`DEMO_EMAIL_DOMAIN`). Login Callout (demo hosts) lists every sample account. Do not use real union/local domains (`opseu.org`, `local243.ca`). Password `demo123`. |
| Demo Cleanup hosted guard | UI, preview/purge APIs, and `db:demo-purge` CLI are unavailable when `UNIONOPS_HOSTED_CUSTOMER_MODE` is true, even when `SITE_ADMIN_DEMO_PURGE_ENABLED` is set. This protects the hosted customer profile; the separate approved customer deletion/retention workflow is still unimplemented. |
| Sandbox | CT 115 @ `192.168.0.115:3000`; **Postgres durable** compose stack @ `289bfb3` (`postgresFlipComplete: true`); `docker-db-1` + `docker-web-1`; demo users via `AUTH_ALLOW_DEMO_USERS` |
| Cron | `CRON_SECRET` required; Bearer or `x-cron-secret`; `?dryRun=1` previews without send/audit |
| React derived state | Do not sync `setState` in `useEffect` for consent flags — derive from roster |
| Production typecheck | `npx tsc --noEmit` / Docker build — unit tests miss route type errors (`#12`, `#13`) |
| Error sinks (Sentry / JSONL) | Defaults **off**. `GET /api/health` → `observability`. Client DSN is **build-time**. Tunnel `/monitoring` — do not open CSP. See [`OBSERVABILITY.md`](../modules/OBSERVABILITY.md) |

## Sensible next candidates

1. Ops: production hosts still choose Postgres flips + real scanner — see [`docs/guides/POSTGRES_OPS.md`](../guides/POSTGRES_OPS.md). Local verify path: `npm run ops:verify-durable` (deploy gate → seed → durability → RLS). Overlay: `docker-compose.durable.yml` + `HEALTH_REQUIRE_DURABLE`. DB updates use `docker/db-deploy.mjs`; see [`session-knowledge-2026-09-20-verified-db-deploy.md`](session-knowledge-2026-09-20-verified-db-deploy.md).
2. ~~COMMS email/broadcast guide (fifth-channel)~~ — **shipped 2026-07-26** (`/guide/email-broadcast`); train #2 wired home, footer, First week, tools index; **how-to expansion 2026-08-19**
3. ~~Time **8f** hybrid slice / punch photos~~ — **shipped 2026-07-26** (slice v1.1 + migration `0029_time_8f`)
4. ~~Optional: canvas tool axe color-contrast on brand-orange previews (6 smoke failures noted 2026-07-25)~~ — **shipped 2026-07-25** (`mutedInkOnBackground`)
5. ~~Ops: redeploy sandbox after train merges~~ — **done 2026-07-26** (`9446186`, health ok, 137/137 smoke)
6. ~~API route auth unit gap (cron / forgot-password)~~ — **shipped 2026-07-26** (train #3)
7. Ops: `npm run health:check` before sandbox smoke — **shipped 2026-07-26** (train #4)
8. Guide discoverability polish (print/email sources, FR smoke, Brand Kit link) — **shipped 2026-07-26** (train #5)
9. ~~Basecamp automatic check-ins + Hub unanswered widget~~ — **shipped 2026-07-26** (`checkins` HubModule)
10. ~~Comms stretch: printable seniority worksheet + right-to-refuse pocket card~~ — **shipped 2026-07-26** (Document Generator + QR Link Card presets)
11. ~~Discussions / Tasks stretch (reactions, @mentions, poll-on-focus)~~ — **shipped 2026-07-26** (no websockets; migration `0027_hub_social`)

## Comms external links (2026-07-30)

| Topic | Reality |
|-------|---------|
| Root cause | **Upstream** — reference tenant national union website reorganized; deep CMS URLs (e.g. `/12263`) retired — **not UnionOps regressions** |
| Registry | `src/lib/constants/comms-sources.ts` + `SourcesBlock` |
| Ticket | **`LINK-001` closed 2026-07-30** — registry + `/assets` + ZIP footers; optional lychee CI + `hub03` seed check remain |
| Multi-union | **`LINK-002` closed 2026-07-30** — `unionIds` filter on SourcesBlock/Resources/`/assets`; no casual third-party logo packs |
| Playbook + narrative | [`external-links-audit-plan.md`](external-links-audit-plan.md), [`session-knowledge-2026-07-30.md`](session-knowledge-2026-07-30.md), [`.cursor/rules/external-links.mdc`](../../.cursor/rules/external-links.mdc) |
| Verify | Browser-first for `opseu.org` (automated HEAD often 403) |
| Steward copy | `sources.intro` in EN/FR — use `/assets` mirrors when national links fail |

## Route status / Local 404 (2026-08-09)

| Topic | Reality |
|-------|---------|
| Stock “404 This page could not be found.” | Next default — root `not-found` + `global-error` kill it |
| Quips | Stable pathname hash; banks in `routeUi.quips` EN/FR |
| Portal | Own `not-found`/`error`/`loading` — not Hub, not public tools CTAs |
| Missing poll/RSVP/meeting | Call `notFound()` (HTTP 404); do not return 200 inline |
| Eggs | Quiet 243 footnote; snowmobile on 5× mark tap only |
| Narrative | [`session-knowledge-2026-08-09-local-404.md`](session-knowledge-2026-08-09-local-404.md) |

## Public workshop Comms (2026-08-08/09)

| Topic | Reality |
|-------|---------|
| Live demo order | Logo Builder → Social Examples → Graphic Maker → Quote Card → Website Template |
| Facilitator | [`docs/guides/WORKSHOP_SOCIAL_COMMS.md`](../guides/WORKSHOP_SOCIAL_COMMS.md) Day-of section |
| Public outline | `/guide/workshop`; First week calendar on `/guide/social-media-plan` |
| UX contract | [`.cursor/rules/comms-public-ux.mdc`](../../.cursor/rules/comms-public-ux.mdc) |
| Smoke | `e2e/workshop.smoke.spec.ts` (`@smoke`, quote the tag in PowerShell) |
| Wednesday pitch | Demo-complete boards/print/social — **not** a one-click campaign OS / mass email |
| Narrative | [`session-knowledge-2026-08-09-workshop-comms.md`](session-knowledge-2026-08-09-workshop-comms.md) |
| Flyer + unified chrome (2026-08-14) | Flyer Maker QOL v2; shell checklist — [`session-knowledge-2026-08-14-flyer-unified-tools.md`](session-knowledge-2026-08-14-flyer-unified-tools.md) |
| Share Kit (2026-08-18) | Folded into Graphic Maker; old `/tools/share-kit` URLs redirect |

## Next — Phase 9 export integrity (shipped 2026-08-14)

| Topic | Reality |
|-------|---------|
| Capture | `src/lib/export/capture.ts` — unscale MobilePreviewStage, inline computed styles, pin box |
| PDF | PNG→JPEG re-encode before jsPDF (avoids multi‑MB raw embeds) |
| Smoke | `e2e/tools.export.smoke.spec.ts` — Flyer / Graphic / Board Notice / Solidarity downloads |
| Tickets | TOOL-008 / TOOL-009 **closed** |
| Capture-safe reminder | Inline hex/rgba on capture roots — Tailwind v4 `oklch` utilities wash out `html-to-image` |

## Agent habits

- Diff docs vs code before “implement next” — plan files and backlog tickets lag
- National citation URLs: edit `comms-sources.ts` only; follow `LINK-001` replace-vs-remove policy
- Bounded PRs; EN/FR + module spec + PROGRESS + rules in same milestone
- Grep access-helper call sites when signatures change
- UnionOps Data now opts into local-scoped operational imports and lifecycle history; it does not replace national membership or payroll systems. Dues reconciliation remains deferred. Skip Basecamp **Campfire / hill charts** greenfield — check-ins shipped
- Route status UX: extend `RouteStatusPanel` + `routeUi` — do not invent parallel 404 chrome
- Public workshop talk: follow Demo Path + `comms-public-ux.mdc`; Hub/Portal out of live demo; do not recreate `feat/comms-workshop-ux`

## Enterprise launch work — 2026-09-27

- Hosted customer readiness now asks for explicit attachment storage review,
  strict upload scanning, and dated restore/alert delivery evidence; the app
  cannot independently prove provider behavior or a successful external test.
- Platform-admin MFA recovery and the Packet 8 subprocessor registry are
  implemented in source. Provider inventory has no seeded entries; the public
  `/trust/subprocessors` projection is empty until production facts are entered
  and separately approved by a second MFA-verified platform admin.
- Packet 7 now has a restricted UnionOps-operated incident register at
  `/app/site-admin/incidents`, on migration `0066`. Access needs durable
  Postgres-backed accounts/storage, TOTP, and fresh action-bound step-up for
  each view or operation. It records metadata-only access evidence and denies
  app-role deletion. Migration `0067` adds account-scoped TOTP replay state;
  source implementation is present, but deployed RLS verification remains
  pending. Approved retention/cleanup, drill evidence, privacy-request
  workflow, and qualified notification decisions are also outstanding. See
  [`session-knowledge-2026-09-27-incident-register.md`](session-knowledge-2026-09-27-incident-register.md).
- Migration `0069_subprocessor_registry.sql` adds internal records, public-safe
  projections, and append-only audit events with MFA-aware RLS. The required DB
  shape was updated in source but still needs official Drizzle generation and
  deployed Postgres/RLS smoke before production.
- Publishing or withdrawing a projection now requires a same-request fresh
  MFA challenge before provider lookup. Hosted customer mode fails closed if
  the general audit backend is not PostgreSQL. The API correlates intent and
  result events; its RLS transaction records the allow-listed projection
  before/after event atomically. The EN/FR Site Admin panel requires a register
  reload after uncertain outcomes. Focused route tests are authored but not
  executable here; actual provider inventory, legal review, generated shape,
  and target-host RLS/audit evidence remain open. See
  [`session-knowledge-2026-09-27-subprocessor-publish-step-up.md`](session-knowledge-2026-09-27-subprocessor-publish-step-up.md).
- The Site Admin review controls now call the real `POST /api/site-admin/subprocessors/[id]`
  handler; the old `/[id]/review` client path had no route. Review/approval
  challenges before provider lookup, preserves the distinct-admin approval
  rule, and requires durable hosted intent/result audit around the transaction.
  The client freezes the pending decision and requires a successful register
  reload after uncertain outcomes. See
  [`session-knowledge-2026-09-27-subprocessor-review-step-up.md`](session-knowledge-2026-09-27-subprocessor-review-step-up.md).
- Approved legal surfaces, vendor/DPA review, actual provider configuration,
  backup restore, alert delivery, and other launch gates remain outstanding.
  Managed Documents is not in this checkout, but its implementation exists at
  local ref `origin/feat/managed-document-library` and is audited in
  [`session-knowledge-2026-09-27-managed-documents-source-audit.md`](session-knowledge-2026-09-27-managed-documents-source-audit.md).
  Do not build a replacement. Its migration numbers conflict with uncommitted
  work here; integrate only against authoritative main under ADR-020.
- General Workforce Time report exports now use `POST /api/time/export` for
  CSV/XLSX/PDF; the old GET path returns 405. The actor is time-admin checked,
  all filters come from the authenticated union/local scope, and fresh MFA is
  checked before entry reads when host policy is enabled. A correlated success
  audit is required before bytes are returned. EN/FR challenge UI preserves the
  format and date range. Route and integration tests are authored but Vitest,
  typecheck, and hosted TOTP/audit/RLS verification remain unavailable here.
- Travel XLSX/PDF/receipt ZIP exports now use POST with fresh MFA after
  resource scope checks and before advance, claim, and receipt reads. A
  correlated success audit must append before bytes are returned; the old GET
  path returns 405. TravelBoard has a localized challenge/resume form. Focused
  route and integration coverage is authored; Vitest, typecheck, browser
  behavior, and hosted MFA/audit/RLS checks remain pending. See
  [`session-knowledge-2026-09-27-travel-export-step-up.md`](session-knowledge-2026-09-27-travel-export-step-up.md).
- Poll CSV/XLSX result exports now use POST with a fresh MFA check after
  union/local scope validation and before aggregate/free-text reads. The
  correlated audit append must succeed before bytes are returned; the legacy
  GET path returns 405. The UI resumes the selected export with an EN/FR
  challenge form. Route and integration cases are authored; Vitest, TypeScript,
  browser behavior, and hosted MFA/audit/RLS evidence remain pending. See
  [`session-knowledge-2026-09-27-poll-export-step-up.md`](session-knowledge-2026-09-27-poll-export-step-up.md).
- Meeting RSVP CSV exports now use POST with fresh MFA after union/local
  meeting authorization and before response-row reads. A correlated audit
  append is required before the CSV is returned; the old GET path returns 405.
  The localized form resumes the selected meeting export. Focused route tests
  are authored; Vitest, TypeScript, browser behavior, and hosted MFA/audit/RLS
  evidence remain pending. See
  [`session-knowledge-2026-09-27-rsvp-export-step-up.md`](session-knowledge-2026-09-27-rsvp-export-step-up.md).
