# Officer Hub home: lessons and follow-up goals — 2026-09-25

The task-first home shipped in PR #120. See the [UX audit, implementation record, and authenticated before/after captures](plan-2026-09-25-hub-task-dashboard.md). This note records what the work established and what still needs a separate decision or verification pass.

## Lessons to carry forward

- Inspect `/app` with a seeded officer session before changing Hub UI. The public login page gave no evidence about the authenticated hierarchy. The baseline put assigned work below repeated navigation and setup surfaces; the captures show the first attention heading moved to about 391 px at 1280 × 900 and 358 px at 375 × 900.
- Give each surface one job: Hub navigation is wayfinding; the first work area reports assigned tasks and check-ins; next steps are role-permitted actions; the officer-tools catalog is optional discovery; setup is advisory. A static shortcut is not a live “Today” signal.
- Model loading, empty, and failed API responses separately. A failed task request must not imply zero assignments, and an empty check-in list should not make the entire surface disappear. Do not guess enabled modules while tenant settings are unavailable.
- Derive setup guidance from the active union and its enabled modules. A hardcoded reference-tenant snippet query, a seeded default, or a browser-local page visit cannot prove a local officer has finished setup. Keep platform administration distinct from union/local casework, and preserve the existing API, tenant, role, invite, and MFA gates.
- Compact dashboard notices only while keeping their warning visible and full detail accessible. Review French at intermediate widths: the Hub's dashboard navigation needed its drawer below 1536 px to avoid wrapping over the work area.

## Follow-up goals

1. **~~Decide the member landing state when Portal is disabled.~~** Closed 2026-09-30 — members always get `HubFeatureTeaser` on `/app`; Portal-off copy explains the gap without casework widgets. See Wave A fit-gap.
2. **~~Browser-verify a platform administrator.~~** Closed 2026-09-30 — demo `platform.admin@unionops.test` + dashboard smoke asserts Platform work without local Attention widgets.
3. **Complete human accessibility checks.** Automated EN/FR reflow passed; 200% zoom approximation shipped 2026-09-30. Test with a screen reader and record results in the accessibility manual checklist.
4. **Add live attention signals only when scoped data supports them.** **Still SKIP** — do not invent deadline counts without adapter summaries. Home tiles may show **fetched list length** for tasks/check-ins already returned by those APIs.

## Command-center visual expand (2026-10-03)

Shipped on top of the task-first IA (do not treat `/app` as a public marketing hero):

- Identity plate uses tenant union/local names. Empty local numbers are omitted (no 777 wink on Hub home).
- Next-steps list + collapsed Officer tools catalog folded into `HubHomeLaunchpad`.
- Platform admin home uses `PlatformOperatorCard variant="card"`.
- Member `FeatureTeaserPanel` uses ghost + elevated bullets; still no casework widgets.


## Second-nav corrective rework (same day follow-on)

Shipped after the task-first home:

- **Orphan pipe:** render `|` only when `useHubContextReady()` is true (tenant + union present).
- **No module inventing:** HubNav uses `tenant?.union.enabledModules ?? []` like the dashboard — never `PRESIDENT_OVERLAY_MODULES` in chrome.
- **Empty strip:** when `getHubNavModules` is empty, promote configuration / invites / onboarding links for roles that already pass those gates (not for `local_exec`).
- **Tool gating:** grievance casework tools require the grievance module flag; bumping still gates calendar via bumping flag; admin setup tools stay role-only.
- **Grievances off:** page-level `ModuleDisabledPanel`; client 403 with `"Grievance module disabled"` uses `loadErrorModuleDisabled` + Callout, not the “ask a local officer” forbidden string.

The broad parallel smoke run encountered a Brand Kit reset-dialog failure after 43 of 337 cases; that case passed alone, while the focused Hub checks passed. Revisit the parallel test only if it recurs; this run does not establish a Hub regression.
