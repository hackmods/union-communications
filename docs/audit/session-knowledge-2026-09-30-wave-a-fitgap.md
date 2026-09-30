# Session knowledge — Wave A fit-gap (VL-HUB + member Portal-off) — 2026-09-30

## Baseline verdicts

| ID | Verdict | Evidence |
|----|---------|----------|
| **A1** VL-HUB-2 | **NARROW → closed scripted** | Task-first Hub dashboard already met first-viewport attention + five-width overflow (`e2e/hub.dashboard.spec.ts`). Gap was a shared 1280 composition contract across dashboard, grievance detail, and Portal Hall. Added `assertDesktopComposition` + `e2e/hub.composition.spec.ts`. |
| **A2** VL-HUB-4 | **NARROW** | Automated 200% zoom approximation (`documentElement.style.zoom = 200%`) + drawer usable. **Human NVDA/VoiceOver pass still required** — checklist below. Do not claim SR complete. |
| **A3** VL-HUB-3 | **NARROW → partial** | Full axe suite already existed outside `@smoke`. Widened smoke subset with `bylaws` + `proposals` (+ FR still dashboard/grievances/profile). Full `hub.a11y` remains serial / non-blocking for default CI. |
| **A4** Member Portal-off landing | **FULL → fixed** | `shouldShowHubFeatureTeaser` wrongly required Portal-as-home, so members with Portal off landed on the officer Attention board. Now any `prefersPortalHome` role always gets `HubFeatureTeaser`; Portal-off copy + ask-officers path. Unit: `portal.test.ts`. |

## UI/UX review (scripted)

- **375–1920:** existing dashboard reflow retained; new 1280 composition asserts heading Y + bounded measure.
- **Portal Hall @1280:** overflow + heading-in-viewport.
- **Member `/app` Portal off:** teaser explains Hub without casework widgets; no “Open Local Portal” CTA.

## Lessons

1. Alignment Gate matters: VL-HUB-2 looked “open” in backlog while dashboard composition was mostly shipped — residual was cross-route contract, not a rebuild.
2. Portal-off member home was a silent product hole: redirect logic sent members to `/app`, but the teaser gate still assumed Portal was enabled.
3. `zoom: 200%` is stronger than shrinking the viewport to 640 alone for catching chrome that only breaks when layout CSS assumes 1×.

## Residuals / next

- **A2 human:** With NVDA or VoiceOver on `/en/app` and `/en/app/grievances/[id]`: announce Attention / Next steps landmarks; drawer open/close; French Hub nav at 1536. Record Pass/Fail in `accessibility-manual-review-checklist.md`.
- **A5** ~~platform-admin browser fixture~~ — shipped: `platform.admin@unionops.test` demo roster + `loginAsPlatformAdmin` + dashboard smoke.
- **A6** live attention deadline counts — **SKIP** until overdue/meetings adapters expose trustworthy union/local-scoped summaries (do not invent counts).
- **A7** Hub peers — **SKIP** overflow already covered for snippets/marketplace/overdue in `hub.mobile`.
- **A8** Manual checklist — leave human rows Not assessed; point Hub dashboard / composition to scripted evidence in this note.

## A5–A8 disposition (same day)

| ID | Verdict | Notes |
|----|---------|-------|
| A5 | FULL | Demo `platform_admin` + Callout role + e2e host-ops assertions |
| A6 | SKIP | No trustworthy scoped deadline API yet |
| A7 | SKIP | Mobile overflow already asserted |
| A8 | NARROW | Human checklist still required for SR/print; scripted Hub coverage exists |

## Files touched

- `src/lib/portal/access.ts`, `portal.test.ts`
- `src/components/hub/HubFeatureTeaser.tsx`
- `src/lib/auth/demo-users.ts`, `demo-login-accounts.ts`
- `messages/en.json`, `messages/fr.json` (`hub.teaser.*`, `hub.login.demoAccounts.roles.platformAdmin`)
- `e2e/helpers/auth.ts`, `e2e/helpers/layout.ts`, `e2e/hub.composition.spec.ts`, `e2e/hub.a11y.spec.ts`, `e2e/hub.dashboard.spec.ts`
- `docs/audit/plan-2026-09-30-sitewide-qol-launch-program.md`
- `docs/audit/execution-backlog.md` (VL tickets)
- `docs/PROGRESS.md`