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
**Status:** Accepted  
**Context:** Member photos and local branding are sensitive. Ontario privacy law applies.  
**Decision:** No analytics, cookies, third-party scripts, or network calls for user data.  
**Consequences:** No usage metrics unless self-hosted opt-in analytics added in v2.

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
**Status:** Accepted  
**Context:** Calendar R3 and Hub invites need one-shot mail (accept links, officer self-reminders, optional RSVP confirmations). Operators self-host (CapRover/Docker); a SaaS-only ESP would weaken the privacy posture. Marketing broadcasts and member list collection remain out of scope pending PIPEDA review (`docs/COMPLIANCE.md`).  
**Decision:**
- Use **SMTP via `nodemailer`** (`src/lib/email/send.ts`) gated by `EMAIL_ENABLED=true` plus `SMTP_*` / `EMAIL_FROM`.
- **Transactional only** — invite accept links, officer reminder to `session.user.email`, and opt-in RSVP confirmation when `consentEmailConfirm` + email are provided.
- **No marketing campaigns**, no subscription lists, no grievance case content on this path.
- **Audit every send** (and skipped sends) via `auditLog`.
- When email is disabled or misconfigured, helpers return `{ ok: false, reason: "not_configured" }`; copy-link / mailto flows remain available.
**Consequences:** Operators must configure SMTP for auto-send; Hub Invites can expose Send email when `NEXT_PUBLIC_EMAIL_ENABLED=true`. Password-reset and cron reminders can reuse this helper later without opening a marketing channel.

## ADR-017: Local Portal Circles (solidarity Basecamp parody)
**Status:** Accepted  
**Context:** Rank-and-file members, stewards, and committees need a calm collaboration surface without paying for generic PM tools or exposing confidential Hub casework (grievance notes, bumping strategy). An earlier experimental branch also shipped a Postgres identity/register/approvals fork that conflicted with main’s invite/onboarding and bcrypt demo auth.  
**Decision:**
- Ship **Local Portal** at `/[locale]/portal/*`, gated by `enabledModules.portal` and role set including `local_member`.
- Use solidarity product names only (Circle, Hall, Bulletin, Floor, Actions, Binder, Station, Dispatch, Sidebars, Roll Call, Pipeline, Momentum, Fronts, Oversight) — never Basecamp labels in UI/i18n.
- Default persistence is the **memory** `portalStore` (same as other Hub modules until a Postgres + RLS adapter is flagged).
- Portal does **not** require MFA; confidential Hub modules still do.
- Do **not** land self-serve register / join-local / identity Drizzle schema in this Circles cut — keep main’s demo `passwordHash` auth and existing invite/onboarding.
**Consequences:** Hub discussions/tasks/check-ins remain officer Hub surfaces; Portal is a parallel member-facing Circles product. Roster invites may use the demo user roster until a real directory exists.

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
