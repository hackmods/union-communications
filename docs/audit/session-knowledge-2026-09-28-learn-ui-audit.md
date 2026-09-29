# Session knowledge — Learn UI audit remediation (2026-09-28)

## Source

Muse Viewport Lab audit pack (50 Learn pages). Treated as leads, not gospel.

## Accepted

- Related links before lesson content (`GuideLayout`) — moved after for non-hub presets.
- Officer hub double module list — path becomes progress rail; cards stay primary.
- Further learning plain org names — markdown links via `comms-sources` registry; strip UnionOps peer bullets (chips own peers).
- Steward 101 chrome stack — related after content; aside≠related tools; training nav compact; OL callout after first subsection.
- Quiz "duplication" — template is legend-only; Muse likely double-counted; e2e asserts one legend / no sibling prompt `<p>`.
- Objectives twice — parser leaked objectives bullets into prior section; skip purpose/objectives body in `parseSections`.
- Social Examples clip — `LocalFooter` preview wrap/clamp; not TEST-101 content (Brand Kit localStorage).
- Resources bibliography wall — checklist/demo first; sources in `<details>`.
- Viewport Lab TL-004/006/007 (+ Apply test id); TL-001–003 documented as Muse-side.

## Rejected / deferred

- Exact-once URL per page (kills body CTAs).
- TEST-101 as published content (absent from repo).
- Most "1.Heading" missing-space as visual bugs (AX glue; real bug was `aria-hidden` separator on short-form).
- Hub `StewardGuidesHubBoard` DRY and `/guide`→`/learn` href sweep — **shipped** (compact read-first; Create/Hub hrefs canonicalized).
- In-app Viewport Lab recipe runner.

## Verify

- `npm run test:unit -- src/lib/comms/dedupe-related-links.test.ts src/lib/officer-learning/parse-module.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts`
- `npx playwright test e2e/viewport-lab.smoke.spec.ts`
