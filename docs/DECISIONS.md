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

## ADR-003: CAAT OPSEU as default division
**Status:** Accepted  
**Context:** Target audience defaults to OPSEU Support Staff (CAAT division).  
**Decision:** Default branding, assets, and copy reference CAAT OPSEU. Locals can customize.  
**Consequences:** Asset pack is CAAT-specific; other divisions customize via Brand Kit.

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
