# Session knowledge — union customization foundation

Saved after C01–C15 implementation and the 2026-09-23 polish pass.

## Checkout and commits

- Branch: `feat/union-customization-foundation`.
- Active isolated checkout: `C:\Users\Ryan\.codex\worktrees\union-customization-foundation\union-communications`.
- C01–C04 on main via #101; C05–C15 + polish on this branch (`d423e096` and later).

## Read these first

1. [Implementation plan](plan-2026-09-22-union-customization.md)
2. [Design](../modules/UNION_CUSTOMIZATION.md)
3. [Operator runbook](../guides/CUSTOMIZATION_OPERATOR.md)
4. [Foundation README](../../src/lib/customization/README.md)
5. [Progress](../PROGRESS.md)

## Polish lessons (2026-09-23)

- Never reuse `hub.platformOperator.*` strings on public Brand Kit — stewards hit missing-key / wrong voice. Use `brandKit.baseline.*`.
- Root forms need real body/colour/URL fields; hardcoded placeholders make the panel look finished when content cannot be authored.
- Destructive actions (withdraw / rollback / inherit) need confirm + impact copy; publish should deep-link to `/learn/custom/...` when a slug exists.
- Grants and entitlements are useless until wired into `requireCustomizationSession` / `withCustomizationMutation`.
- Custom guides must stay out of `PUBLIC_PATHS` / sitemap; metadata uses published title with `robots: noindex`.
- AuthorizedGuideView should humanize block IDs and render callouts/lists; never show raw fragment IDs as chapter titles when content exists.

## Still deferred (honest gaps)

- Full Playwright empty-state → publish → withdraw journey and axe on the Root page.
- Grievance/hybrid consumers do not yet pin C12 snapshots on live cases (flag + helper only).
- Entitlement provider is memory/operator-shaped until a durable `customization_entitlements` migration.
- Asset GET remains Root-gated; public logo delivery from customization assets is not steward-facing yet.
- GitHub Actions E2E still deferred per execution directive.

## Security lessons (still binding)

- Never serialize `resolveCustomization` output to readers; use `readPublishedContent` / authorized DTOs.
- Scope descriptors from trusted tenant records only.
- Root is `platform_admin` via the customization-only target path; do not weaken general union-mismatch checks.
- Free public Comms stay free; entitlements never grant membership.
