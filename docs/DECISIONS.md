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

## ADR-008: Postgres + RLS for tenant isolation
**Status:** Proposed (Phase 1+)  
**Context:** Multi-union tenancy requires strict data isolation.  
**Decision:** PostgreSQL with Row-Level Security on `unionId` / `localId`.  
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
