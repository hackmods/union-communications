# OPSEU customization use case (follow-up)

How to use the union customization foundation to tailor UnionOps for **OPSEU / SEFPO** without scraping national sites or promising Hub casework content that OPSEU already owns.

Companion docs: [CUSTOMIZATION_OPERATOR.md](CUSTOMIZATION_OPERATOR.md), [UNION_CUSTOMIZATION.md](../modules/UNION_CUSTOMIZATION.md), [multi-union sources lessons](../audit/session-knowledge-2026-07-30-multi-union-sources.md).

## Product stance

| Do | Do not |
|---|---|
| Publish a reviewed brand baseline and OPSEU-scoped sources Root has checked | Auto-copy OPSEU.org HTML into guides |
| Hide the generic **Bargaining lifecycle** playbook when Brand Kit preset is `opseu` | Pretend UnionOps replaces Staff Rep–led bargaining |
| Create Academic / Support division scopes when the tenant needs them | Hardcode OPSEU as the platform default for new unions |
| Keep free public Comms on-device | Paywall Flyer Maker / Brand Kit for OPSEU |

OPSEU is **reference tenant #1** for Comms Brand Kit. Hub demo seed remains Behind 7 Proxies — never collapse those identities.

## Operator path (Root)

1. Confirm host flags: `CUSTOMIZATION_ENABLED=true`, durable auth, MFA/TOTP.
2. Open `/app/site-admin/customization`.
3. Select the real OPSEU union row → **Create union scope** (does not invite anyone).
4. Draft and publish:
   - **Brand baseline** — colours from the OPSEU Brand Kit preset (`#003DA5` / white / `#002868`). Helper: `opseuBrandBaselineSuggestion()` in `src/lib/customization/opseu-pilot.ts`.
   - **Sources** — prefer registry IDs already scoped to OPSEU (`opseuRecommendedSourceIds()`), with live URL verification per the external-links playbook.
   - **Custom guides** only when you have bilingual, rights-cleared local content (e.g. local meeting norms). Do not republish national bargaining manuals.
5. Optionally create division scopes for Academic and Support when the tenant model needs them (`OPSEU_SUGGESTED_DIVISION_LABELS`).
6. Ask stewards to open Brand Kit → choose OPSEU preset → **Apply published brand baseline** when Root has published one.

## What already ships for OPSEU stewards

| Behaviour | Where |
|---|---|
| OPSEU Brand Kit preset, sectors, identity packs | Brand Kit |
| OPSEU-scoped bibliography only when preset is OPSEU (or unset reference) | `comms-sources` + SourcesBlock |
| **Bargaining lifecycle guide hidden** when Brand Kit preset is OPSEU | Catalog filter + page replacement pointing to opseu.org / member portal / strike + proposal tracker |
| Print guide overlay when `guide:learn-print` is published | `/guide/print` |
| Custom DB guides | `/learn/custom/<union-slug>/<guide-slug>` (noindex) |

## Why bargaining is disabled for OPSEU

OPSEU locals typically work with **national / staff-led** contract negotiations. The generic Ontario lifecycle playbook can mislead OPSEU stewards into treating UnionOps as the bargaining system of record. When Brand Kit is set to OPSEU:

- `/learn` and `/guides` catalogs omit the bargaining playbook card.
- Opening `/guide/bargaining` (or `/learn/bargaining`) shows an OPSEU-specific notice instead of the full playbook.
- Strike operations and Proposal Tracker remain available for local support work around a national table.

Other Brand Kit presets still see the full bargaining guide.

## Suggested first publications (high level)

Use `opseuPilotChecklist()` as the checklist; in Site Admin → Customization, pick the OPSEU union row to reveal **OPSEU / SEFPO starter** buttons that fill brand/source draft fields from the preset and registry (still no auto-publish):

1. `brand:baseline` — colours/fonts only.
2. Reviewed `source:*` rows for national About / contact / member portal (from registry URLs after browser verify).
3. Optional local custom guide for meeting or board practices — not bargaining procedure.
4. Leave grievance CA workflows on compiled tenant config until C12 is explicitly enabled and legally reviewed.

## Verification

```bash
npm run test:unit -- --maxWorkers=2 src/lib/comms/preset-guide-visibility.test.ts src/lib/customization/opseu-pilot.test.ts src/lib/comms/public-catalog.test.ts
```

After deploy: set Brand Kit to OPSEU → confirm bargaining disappears from Learn → open `/guide/bargaining` → see the OPSEU notice.

## Commit / CI note

Ship customization + OPSEU use-case work on `feat/union-customization-foundation` with conventional commits; push arms GitHub Actions. Do not treat green unit tests as a substitute for browser verification of national URLs.
