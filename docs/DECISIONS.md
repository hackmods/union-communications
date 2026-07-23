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

## ADR-014: System font stack — no `next/font` / no remote webfonts
**Status:** Accepted  
**Context:** Audit `UI-004` noted that the app never uses `next/font` and `globals.css` sets `--font-sans` to a pure system stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) with no self-hosted webfont or font-loading strategy. That looked like a possible oversight versus a privacy choice.  
**Decision:** Keep the system-font stack for platform chrome. Do not add `next/font/google`, a Google Fonts (or other CDN) stylesheet, or any remote font fetch — that would weaken ADR-006’s zero third-party network posture. Brand Kit / canvas exports remain free to use colours and layout; they do not introduce a platform-wide webfont. If a self-hosted brand typeface is desired later, use `next/font/local` only (font file bundled with the app, no external request).  
**Consequences:** No webfont CLS/font-metric tuning is needed today (OS fonts paint immediately). Contributors must not “fix” typography by wiring Google Fonts. A future brand typeface is an explicit product choice + `next/font/local`, not a silent dependency add.
