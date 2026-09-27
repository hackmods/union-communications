# Session knowledge — 2026-09-27 — accessibility locale matrix

**Scope:** Packet 9 representative EN/FR Playwright axe coverage  
**Status:** Test cases added; full E2E execution and manual assessment pending

## Coverage added or verified in source

- Public home is scanned in EN/FR with color contrast enabled.
- Create, Utilities, and Learn catalogs now run contrast-enabled axe scans in
  both locales.
- Privacy, Security, Accessibility, and Trust/subprocessor routes have
  localized axe coverage. The EN Accessibility scan is the existing
  contrast-enabled dedicated test; other legal/Trust routes use the shared
  serious/critical helper with contrast disabled.
- Hub login and invalid-invite error states run in EN/FR. The invalid invite
  case is an error-state check; it does not prove successful account
  activation or agreement acceptance.
- Authenticated Hub smoke scans dashboard, grievances, and profile in EN/FR,
  and time administration in EN. MFA setup is represented in EN in the full
  suite and FR in the smoke subset. Existing English Hub mobile scans remain.
- Member Portal Together is scanned in EN and FR; an English Circle workspace
  scan also exists.

## Limits and decisions

- The axe helper disables color contrast by default. Contrast is included for
  selected public-shell scans (Home and Create/Utilities/Learn); this is not a
  complete contrast assessment.
- The demo roster has no `platform_admin` account. Do not add a privileged
  demo identity merely to scan Site Admin. Add a deliberately isolated test
  identity/fixture only after its authentication and cleanup model is reviewed.
- A valid invite requires a controlled invitation fixture and account lifecycle
  cleanup. The invalid-token page is safe for routine smoke but covers only its
  error state.
- No keyboard-only, screen-reader, high-zoom/reflow, touch-target, dialog/focus,
  or print review was performed. Axe coverage is not WCAG conformance evidence.
- Added the blank [`accessibility-manual-review-checklist.md`](accessibility-manual-review-checklist.md)
  for assessors to record test environment, locale, route scope, outcomes,
  barriers, owners, and retests. Every row remains Not assessed.
- `node_modules` is absent in this checkout, so the new Playwright/axe paths
  have not run. Source coverage is not a passing result.

## Verification plan

Run `npm run test:smoke` after dependency installation, fix any discovered
serious/critical violations, and retain the CI report. Then complete the manual
review checklist in Packet 9 against a scoped sample of public, authenticated,
MFA, dialog, and policy-print journeys. Legal/accessibility owners must approve
any public conformance wording separately.
