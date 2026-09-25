# Officer Hub home: lessons and follow-up goals — 2026-09-25

The task-first home shipped in PR #120. See the [UX audit, implementation record, and authenticated before/after captures](plan-2026-09-25-hub-task-dashboard.md). This note records what the work established and what still needs a separate decision or verification pass.

## Lessons to carry forward

- Inspect `/app` with a seeded officer session before changing Hub UI. The public login page gave no evidence about the authenticated hierarchy. The baseline put assigned work below repeated navigation and setup surfaces; the captures show the first attention heading moved to about 391 px at 1280 × 900 and 358 px at 375 × 900.
- Give each surface one job: Hub navigation is wayfinding; the first work area reports assigned tasks and check-ins; next steps are role-permitted actions; the officer-tools catalog is optional discovery; setup is advisory. A static shortcut is not a live “Today” signal.
- Model loading, empty, and failed API responses separately. A failed task request must not imply zero assignments, and an empty check-in list should not make the entire surface disappear. Do not guess enabled modules while tenant settings are unavailable.
- Derive setup guidance from the active union and its enabled modules. A hardcoded reference-tenant snippet query, a seeded default, or a browser-local page visit cannot prove a local officer has finished setup. Keep platform administration distinct from union/local casework, and preserve the existing API, tenant, role, invite, and MFA gates.
- Compact dashboard notices only while keeping their warning visible and full detail accessible. Review French at intermediate widths: the Hub's dashboard navigation needed its drawer below 1536 px to avoid wrapping over the work area.

## Follow-up goals

1. **Decide the member landing state when Portal is disabled.** `signedInHomeHref(["local_member"], ["comms"])` currently returns `/app`, and the Portal session redirects away when the module is disabled. Define a member-safe destination or explanation for this opt-out case, then cover it in route tests. Keep the current Portal-enabled member redirect and invite-only Hub boundary.
2. **Browser-verify a platform administrator.** The dashboard role model covers the platform operator surface, but the seeded browser roster used in this pass had no platform-admin sign-in. Add a test-only authenticated fixture that does not weaken production access, then check that host operations appear without local casework suggestions or cross-union data.
3. **Complete human accessibility checks.** Automated EN/FR reflow passed at 375, 768, 1280, 1536, and 1920 px; forced-colour, reduced-motion, keyboard drawer, and contrast checks passed. Test with a screen reader and actual browser zoom at 200%. A 640 CSS-pixel viewport was only an approximation of the latter.
4. **Add live attention signals only when scoped data supports them.** Meeting and casework deadlines could be useful here if their adapters expose trustworthy union/local-scoped summaries. Keep generic links labelled as actions rather than claiming a count or urgency that was not fetched.

The broad parallel smoke run encountered a Brand Kit reset-dialog failure after 43 of 337 cases; that case passed alone, while the focused Hub checks passed. Revisit the parallel test only if it recurs; this run does not establish a Hub regression.
