# Architecture Decision Records

## ADR-001: Static export, no backend (v1)
**Status:** Accepted  
**Context:** Volunteer union communicators need a simple tool with maximum privacy.  
**Decision:** Use Next.js static export. All processing client-side. No accounts, no database.  
**Consequences:** No server-side auth until v2. Brand sharing via JSON export/import.

## ADR-002: DataAdapter pattern for future auth
**Status:** Accepted  
**Context:** User wants login and local/division connections in the future.  
**Decision:** Abstract all persistence behind `DataAdapter`. v1 = `LocalStorageAdapter`, v2 = `ApiAdapter`.  
**Consequences:** Slight indirection now; avoids rewrite when adding backend.

## ADR-003: CAAT OPSEU as reference tenant (updated)
**Status:** Superseded by ADR-012  
**Context:** Target audience defaults to OPSEU Support Staff (CAAT division).  
**Decision:** Default branding, assets, and copy reference CAAT OPSEU. Locals can customize.  
**Consequences:** Asset pack is CAAT-specific; migrates to tenant config in Phase 1.

## ADR-004: html-to-image for graphics export
**Status:** Accepted  
**Context:** Need PNG/SVG export from styled React components.  
**Decision:** Use html-to-image to capture DOM nodes styled with Tailwind.  
**Consequences:** Export quality depends on browser rendering; pixelRatio set to 2-3 for hi-res.

## ADR-005: Full EN/FR i18n from v1
**Status:** Accepted  
**Context:** Ontario public-sector unions operate bilingually (AODA + member expectations).  
**Decision:** next-intl with complete UI strings in en.json and fr.json.  
**Consequences:** All new UI text must be added to both locale files.

## ADR-006: Privacy by design — zero data collection
**Status:** Accepted (amended 2026-09-08)  
**Context:** Member photos and local branding are sensitive. Ontario privacy law applies.  
**Decision:** No analytics, cookies, third-party scripts, or network calls for user data.  
**Consequences:** No usage metrics unless self-hosted opt-in analytics added in v2.  
**Amendment:** Optional **operator error sinks** (Sentry and/or server JSONL file), toggled only via host env (`SENTRY_*`, `ERROR_LOG_FILE_*`), are out of scope of product analytics. No Session Replay, no usage metrics, no request bodies / cookies in error payloads. See [`HOSTED_SECURITY.md`](guides/HOSTED_SECURITY.md).

## ADR-007: Central multi-tenant hub with hybrid escape hatch
**Status:** Accepted  
**Context:** Long-term hub for locals with optional paranoid-local data mode.  
**Decision:** Central hosted platform with hybrid encrypted export for sensitive modules.  
**Consequences:** Comms can stay public; grievance/bumping require auth.

## ADR-013: Collection (BargainingUnit) under Local
**Status:** Accepted (Phase 6.0+)  
**Context:** CAAT Support Staff locals often have distinct FT and PT collective agreements; multi-local division admins need an active scope switcher. “Collection” is not a tenancy root — it sits under Local.  
**Decision:** Optional `BargainingUnit` (`id`, `unionId`, `localId`, `code`, `name`, optional `grievanceConfig`). UI label **Collection**. CA steps resolve collection → union fallback. Hub JWT carries `localId` + `bargainingUnitId` for list filters; Brand Kit v2 profiles mirror FT/PT identity for Comms.  
**Consequences:** RLS (when Postgres lands) keys `unionId` / `localId` / optional `bargainingUnitId`. No first-party member portal; officer Hub + public Comms remain the dual surface.

## ADR-008: Postgres + RLS for tenant isolation
**Status:** Proposed (Phase 6)  
**Context:** Multi-union tenancy requires strict data isolation.  
**Decision:** PostgreSQL with Row-Level Security on `unionId` / `localId` / optional `bargainingUnitId` (ADR-013).  
**Consequences:** Requires backend; static export only for public comms.

## ADR-009: Grievance data highly confidential — MFA + audit mandatory
**Status:** Proposed (Phase 2+)  
**Context:** Grievance records contain sensitive member and workplace data.  
**Decision:** MFA required; immutable audit log on all access.  
**Consequences:** No grievance module before auth shell ships.

## ADR-010: PDF comparison client-first where possible
**Status:** Proposed (Phase 3+)  
**Context:** College bumping module needs PDF compare with privacy.  
**Decision:** Client-side parse when possible; server store for committee persistence.  
**Consequences:** Virus scan on server uploads.

## ADR-011: Supersede ADR-001 for authenticated modules
**Status:** Proposed (Phase 1+)  
**Context:** Grievance and bumping cannot use static export only.  
**Decision:** Public comms remains static; authenticated routes use API + DB.  
**Consequences:** Dual deployment pattern or drop static export for hub routes.

## ADR-012: Multi-union by design
**Status:** Accepted  
**Context:** Platform must empower any local, any union — not only OPSEU.  
**Decision:** Union-agnostic core; OPSEU/CAAT is reference tenant #1 in seed data only.  
**Consequences:** No union names in core code; `UnionConfig` drives branding and modules.

## ADR-014: System font stack for chrome; self-hosted canvas brand faces
**Status:** Accepted (amended 2026-08-15)  
**Context:** Audit `UI-004` noted that the app never uses `next/font` and `globals.css` sets `--font-sans` to a pure system stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) with no self-hosted webfont or font-loading strategy. That looked like a possible oversight versus a privacy choice. Comms exports later needed OPSEU-like campaign typography and consistent preview↔PNG faces, which OS system stacks (Impact / Arial Narrow / Rockwell) cannot guarantee.  
**Decision:**
- Keep the **system-font stack for platform chrome** (shell, Hub, forms). Do not add `next/font/google`, a Google Fonts (or other CDN) stylesheet, or any remote font fetch — that would weaken ADR-006’s zero third-party network posture.
- **Canvas / Brand Kit typefaces** use `next/font/local` only: OFL faces bundled under `public/fonts/`, CSS variables from [`src/app/canvas-fonts.ts`](../src/app/canvas-fonts.ts), catalog in [`src/lib/comms/canvas-fonts.ts`](../src/lib/comms/canvas-fonts.ts). Defaults: Montserrat (headline) + Source Sans 3 (body). Hybrid residual: `systemSans` / `systemSerif`. Flyer may override with `inherit` or a catalog id.
- Capture waits on `document.fonts.ready` before rasterizing.

**Consequences:** Chrome stays zero-network and paints immediately. Export canvases share consistent brand faces across devices. Contributors must not “fix” typography by wiring Google Fonts or expanding to an unbounded free-font dump.

## ADR-015: Anonymous pulse poll responses (FUTURE-006)
**Status:** Accepted  
**Context:** Pulse polls need member answers aggregated for officers, which cannot stay fully on-device. Public collection is a new surface vs ADR-006’s “zero data collection” for Comms tools. Petition signatures remain out of scope.  
**Decision:**
- Collect **anonymous** answers only (no member account, name, or email on the response record).
- Require an **explicit consent checkbox** when `consentRequired` is true (default) before submit.
- Never store raw client IP — store an optional **one-way hash** (`ipHash`) solely for light in-memory rate limiting.
- No third-party analytics, trackers, or embeddable survey SaaS.
- Retention: officers may close a poll; durable retention/deletion policy is the instance operator’s responsibility under hosted Hub data-controller rules (`docs/COMPLIANCE.md`). Prefer `POLLS_DB_BACKEND=postgres` for production collection; memory remains the demo default.
**Consequences:** `POST /api/polls/[slug]/responses` is a documented public API route; officer create/results routes stay MFA-gated. Complements ADR-006 for Comms without reopening third-party tracking.

## ADR-016: Transactional SMTP only (no marketing email)
**Status:** Accepted; marketing boundary partially superseded by ADR-021
**Context:** Calendar R3 and Hub invites need one-shot mail (accept links, officer self-reminders, optional RSVP confirmations). Operators self-host (CapRover/Docker); a SaaS-only ESP would weaken the privacy posture. Marketing broadcasts and member list collection remain out of scope pending PIPEDA review (`docs/COMPLIANCE.md`).  
**Decision:**
- Use **SMTP via `nodemailer`** (`src/lib/email/send.ts`) gated by `EMAIL_ENABLED=true` plus `SMTP_*` / `EMAIL_FROM`.
- **Transactional only** — invite accept links, officer reminder to `session.user.email`, and opt-in RSVP confirmation when `consentEmailConfirm` + email are provided.
- **No marketing campaigns**, no subscription lists, no grievance case content on this path.
- **Audit every send** (and skipped sends) via `auditLog`.
- When email is disabled or misconfigured, helpers return `{ ok: false, reason: "not_configured" }`; copy-link / mailto flows remain available.
**Consequences:** Operators must configure SMTP for auto-send; Hub Invites can expose Send email when `NEXT_PUBLIC_EMAIL_ENABLED=true`. Password-reset and cron reminders can reuse this helper. The existing transactional helper remains unavailable to marketing campaigns; ADR-021 defines a separate gated path for voluntary individual product news.

## ADR-017: Local Portal Circles (solidarity collaboration)
**Status:** Accepted  
**Context:** Rank-and-file members, stewards, and committees need a calm collaboration surface without paying for generic PM tools or exposing confidential Hub casework (grievance notes, bumping strategy). An earlier experimental branch also shipped a Postgres identity/register/approvals fork that conflicted with main’s invite/onboarding and bcrypt demo auth.  
**Decision:**
- Ship **Local Portal** at `/[locale]/portal/*`, gated by `enabledModules.portal` and role set including `local_member`.
- Frame the product as **solidarity collaboration**, not a Basecamp parody and not a shop-floor glossary. Similar jobs (discussions, to-dos, files) are fine; matching Basecamp’s naming system is not.
- Use solidarity memes and names members already chant (Circle, Hall, Bulletin, Floor, Actions, Binder, Together, Dispatch, Sidebars, Roll Call, Many hands, One fight, Hold the line, Oversight, Roster) — never Basecamp labels (Campfire, Hey!, Lineup, Hill Chart, Card Table) in UI/i18n.
- Prefer we/us/ours language over locker/shop/bargaining-table puns. French must carry the same *job*, not the same joke.
- Implementation keys/routes may keep older slugs (`station`, `fronts`, `momentum`, `pipeline`, `/portal/fronts`) so bookmarks and `?tab=` stay stable.
- Default persistence is the **memory** `portalStore` (same as other Hub modules until a Postgres + RLS adapter is flagged).
- Portal does **not** require MFA; confidential Hub modules still do.
- **Security-profile amendment (2026-09-27):** In a UnionOps-operated hosted customer instance, current privileged roles/capabilities, delegated administration, and Circle administrators must complete production TOTP before Portal pages or APIs grant access. Basic local members remain exempt unless their account enables MFA. Evaluation and self-hosted behavior remains operator-configurable. This amendment supersedes the general “Portal does not require MFA” line above for the hosted customer profile.
- Do **not** land self-serve register / join-local / identity Drizzle schema in this Circles cut — keep main’s demo `passwordHash` auth and existing invite/onboarding.
**Consequences:** Hub discussions/tasks/check-ins remain officer Hub surfaces; Portal is a parallel member-facing Circles product. Roster invites may use the demo user roster until a real directory exists. Do not restore analog brands (Station, Fronts, Momentum, Pipeline) or shop puns (Locker, On the table, The push, Shop board) as product titles.

## ADR-018: Site feedback (product mail, not union casework)
**Status:** Accepted  
**Context:** UnionOps had no in-product way to collect website ideas, bugs, accessibility barriers, or workshop notes. GitHub Issues on `/support` is a public-bug path; Pulse Polls are local anonymous collection. A public form plus Hub/Portal send-home must not become tenant casework or a third-party survey (ADR-006).  
**Decision:**
- Collect **website feedback only** via `POST /api/feedback`. Public `/feedback` and signed-in `/app/send-feedback` (any Hub role) plus Portal `/portal/send-feedback` share one store.
- Do **not** store `unionId` / `localId` / case ids. Server-stamp `source` (`public` | `hub` | `portal`) and optional `submitterUserId` from the session. Ignore client-supplied identity.
- Require an **explicit consent checkbox**. Optional name/email is **reply-only** (ADR-016) — never a mailing list.
- Never store raw client IP — store an optional **one-way hash** (`ipHash`) solely for in-memory rate limiting (same posture as ADR-015).
- No third-party forms, analytics, or embeddable survey SaaS.
- Inbox at `/app/feedback` is **`platform_admin` only**. This is operator product mail, not a cross-union read of tenant content.
- Retention: operator may delete anytime; prefer 24 months then purge. Prefer `FEEDBACK_DB_BACKEND=postgres` for production collection; memory remains the demo default. Optional `FEEDBACK_REQUIRE_DURABLE=true` refuses POST on memory so workshop hosts cannot silently drop notes.
**Consequences:** Complements ADR-006 for Comms without reopening tracking. GitHub Issues stay available for public repros. Pulse Polls stay the local member channel.

## ADR-019: Comms stay free; hosted Hub/Portal recovers hosting cost
**Status:** Accepted  
**Context:** `/manifesto` and Support SEO promised UnionOps was “free (and always will be)” with “no premium tiers.” That was true for on-device Comms. Officer Hub and Local Portal hold real case files; hosting them for other locals has compute, backup, email, support, and data-controller cost. Demand made the absolute promise unsafe.  
**Decision:**
- **Comms toolbox stays free** — on-device, no ads, no tracking, no paywall on a poster.
- **Source on `main` is proprietary** (see `LICENSE`). A future source-available / self-host grant track is documented in `docs/guides/LICENSING.md` — do not advertise self-host while the proprietary LICENSE applies.
- **If UnionOps hosts Officer Hub or Local Portal** for a local, ask enough to cover that hosting — not a lock-in subscription, not a public `/pricing` page until product sets a number.
- Do **not** tell volunteers the whole platform is free forever. Public copy: `/manifesto` (nav: “About UnionOps”), Support, Home metadata, README.
**Consequences:** Coffee tips on `/support` cover the public Comms site only. They are not Hub hosting. Inventing a price or a `/pricing` route still needs an explicit product cut.

## ADR-020: Verified, forward-only database deployments
**Status:** Accepted
**Context:** The Drizzle journal, `platform_meta`, and a separate data-version runner could disagree while production still served with missing critical columns.
**Decision:** Use the append-only Drizzle journal as the sole upgrade ledger. Container boot validates it, serializes replicas, migrates as owner, proves the exact schema-qualified image tail, and verifies generated schema/RLS shape before serving. Data massage ships in forward idempotent migrations.
**Consequences:** Production fails closed; no automatic destructive downgrade. The old metadata/data runner and health-only probe are retired. Existing applied entries and production data are preserved through reconciliation migration 0036. See [`docs/audit/adr-020-database-deployment-contract.md`](audit/adr-020-database-deployment-contract.md).

## ADR-021: Gated, individual UnionOps product-news email
**Status:** Accepted for engineering implementation; legal and launch approval remain pending
**Date:** 2026-09-27
**Supersedes:** ADR-016 only as to the absolute ban on a separate product-news channel. The transactional sender itself remains marketing-ineligible.

**Context:** UnionOps needs a voluntary way to tell interested individuals about product changes. Hub, Portal, support, feedback, invite, and union membership addresses were collected for other purposes and must not become a product-news audience. Any campaign capability also creates consent, suppression, provider, privacy, and sender-identity obligations that the existing one-shot email helper does not provide.

**Decision:**
- Product news is a separate UnionOps program for addresses that individuals submit themselves. Never import Hub, Portal, support, feedback, invitation, customer, or union member rosters.
- Use an unchecked, purpose-specific opt-in followed by address confirmation. Do not activate a grant or send product news before the matching confirmation.
- Preserve append-only grant, confirmation, withdrawal, unsubscribe, and justified correction evidence. Assign a database order to events; a confirmation applies only to the exact latest grant. Withdrawal, unsubscribe, or correction can suppress an address; a correction cannot manufacture affirmative consent.
- Keep the existing transactional/security path independent. Marketing sends use a separate typed service, test current consent and suppression at send time, and include approved sender/contact details plus a working unsubscribe action. Never call SMTP or Mailgun directly from campaign code.
- Keep subscription, confirmation, preference, and campaign surfaces disabled by default. Enabling requires approved wording and sender identity, verified contact details, durable database storage, a production email configuration, privacy/retention approval, and live suppression/unsubscribe tests. Self-hosted instances remain responsible for their own configuration and legal review.
- Unsubscribe requests suppress future sends immediately in the application. Each sent message's unsubscribe mechanism must remain usable for at least 60 days. The CRTC says unsubscribe requests must be given effect without delay and no later than 10 business days; UnionOps' send gate is designed to apply suppression immediately. See the [CRTC CASL FAQ](https://crtc.gc.ca/eng/com500/faq500.htm) and [Decision CRTC 2019-111](https://crtc.gc.ca/eng/archive/2019/2019-111.htm).
- Do not add tracking pixels, open tracking, third-party list sharing, or analytics to this program.

**Consequences:** ADR-016's current sendTransactionalEmail path remains transaction-only. Packet 5 must establish durable evidence, address confirmation, a no-login preference path, a consent-gated marketing sender, and restricted campaign controls before any product-news send is enabled. This engineering decision does not approve CASL wording or decide legal applicability.

**Implementation note (2026-09-27):** Packet 5 source now includes those paths under a disabled-by-default `UNIONOPS_PRODUCT_NEWS_ENABLED` gate. The gate also checks an exact EN/FR notice version and approval reference, sender/contact/postal identity, HTTPS public URL, durable Postgres, Mailgun API and signed failure/complaint feedback, email transport, and token keys. A scheduled worker locks the subscriber row during each provider call; provider failure, complaint, and unsubscribe events suppress later sends. The qualified wording review, actual CapRover values, mailbox/provider tests, and live PostgreSQL/RLS evidence are still required before operation.

## ADR-022: Gated enterprise email capabilities (broadcast, Comms auto-send, grievance SMTP, tracking)
**Status:** Accepted for engineering; legal/CASL review still required before production enablement
**Date:** 2026-09-27
**Amends:** ADR-016 (absolute ban on member broadcasts / grievance SMTP) and ADR-021 (absolute ban on tracking pixels) only as dual-gated opt-ins. Product-news marketing path remains tracking-off forever.

**Context:** Hosted enterprise operators need durable compose + ops for member outreach and case follow-up without shipping a Mailchimp-class product. Capabilities must stay fail-closed on CapRover and per-union, default off.

**Decision:**
- Four capabilities, each **default off**:
  1. **Member broadcast** — Hub/Portal-scoped sends to consenting local/union audiences (`classification: "broadcast"`).
  2. **Comms auto-send** — optional SMTP from Comms tools when the dual gate is open (copy/mailto remains the default UX).
  3. **Grievance SMTP** — optional platform send of grievance drafts when the dual gate is open (copy-only remains the default).
  4. **Tracking pixels** — optional open/click tracking for broadcast (never for product-news `marketing` classification).
- **Dual gate (AND):** CapRover host env `UNIONOPS_*_ENABLED=true` **and** platform-admin per-union entitlement columns on `unions` (migration `0078`). Absence of Postgres never grants entitlement.
- Site Admin Email Ops surfaces host flags + union checkboxes; union toggles are disabled until the matching CapRover flag is on.
- Audit every entitlement change (`site_admin.email_entitlements.update`).
- Still not Mailchimp: no third-party ESP lock-in, no imported national lists, no open tracking by default, consent/suppression required before broadcast send paths ship.

**Consequences:** Send helpers must call `assertEnterpriseEmailCapability` before broadcast / Comms auto-send / grievance SMTP / openTracking. Self-hosts that never set CapRover flags remain identical to pre-ADR-022 behavior.

## ADR-023: Gated union/org outreach lists (national lists)
**Status:** Accepted for engineering; legal/counsel approval required before host enablement
**Date:** 2026-09-30
**Distinct from:** ADR-021 (UnionOps product news to self-submitted individuals) and ADR-022 member broadcast (local Hub/Portal consenting members).

**Context:** Some unions need durable, union-wide outreach lists for national or organizational campaigns—not local member broadcast, not UnionOps product marketing, and not Comms on-device copy. These lists carry CASL/consent, suppression, MFA-gated import, and platform-admin entitlement obligations similar to other enterprise email lanes.

**Decision:**
- Outreach lists are a **separate program** scoped by `unionId`. They are not local member broadcast, not product news, and must not reuse Hub rosters, Portal membership, or Comms tools as implicit audiences.
- **Dual gate (AND):** CapRover `UNIONOPS_OUTREACH_LISTS_ENABLED=true` **and** platform-admin `unions.outreach_lists_enabled=true`. Sends also require `readOutreachListsConfig()` to pass (approved EN/FR notice version, `UNIONOPS_OUTREACH_LISTS_APPROVAL_REFERENCE`, sender/contact/postal identity, durable Postgres, Mailgun + signed feedback, email transport, token keys)—fail closed like product news.
- Counsel must approve the notice before operators enable the host flag. Ship **default OFF**. No Campfire / third-party list branding.
- Double opt-in: imported or self-serve subscribers start `pending_confirmation`; only signed-token confirmation activates sends. CSV import requires MFA step-up, dry-run support, attestation text, and pending-only rows.
- Classification `list_campaign` (Mailgun tag `unionops-outreach-list`)—not `broadcast`. Tracking pixels stay off.
- Union-wide compose/release is **union_admin** (and platform admin) only; fresh MFA on send and import. Site Admin exposes entitlements, inventory metadata, MFA-gated exact-address search, pause/resume, approval env display, and metadata-only audit export.

**Consequences:** Migration `0088` adds outreach tables + RLS. Comms free lane unchanged. Production enablement requires legal approval, CapRover values, union entitlement, and live suppression/unsubscribe drills.

## ADR-024: Hosted Free/Full plans (operator dark launch)
**Status:** Accepted for engineering; public pricing deferred
**Date:** 2026-09-30
**Extends:** ADR-019 (Comms free; hosted Hub/Portal may recover hosting cost)

**Context:** Operators need a way to opt CAAT locals into Free lite or Full hosted access, with Member (donation) vs Paid (seat SKU) as commercial labels only. Public volunteers must not see pricing or upgrade CTAs yet.

**Decision:**
- **Access class** `free` | `full` drives Hub/Portal caps. **Member and Paid share Full access.**
- **Commercial class** `member` | `paid` is billing-only (donation note vs seat SKU). Never branch module gates on commercial class.
- **Dual gate:** CapRover `UNIONOPS_HOSTED_PLANS_ENABLED` (default off / fail-open) **and** Site Admin assignment on union and/or local.
- **Union defaults inherit** to locals; local may override (e.g. Free under Full). Optional module/portal subsets narrow Full.
- No public `/pricing`, no Stripe in this ADR, no What's new billing notes. Operator guide: `docs/guides/HOSTED_PLANS.md`.

**Consequences:** Migration `0093_hosted_plans`. Host readiness shows CapRover paste while dark. Flip the flag only after assigning plans.

