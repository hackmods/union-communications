# Session knowledge — Strike operations playbook (2026-09-05)

## What shipped

Split the old “Strike Guide” nametag from Crisis Comms.

| Surface | Path | Role |
|---------|------|------|
| Strike operations | `/guide/strike` | Command, picket line, member care, money, safety, two rhythms, return to work. Principle-level only |
| Crisis comms | `/guide/crisis` | Who may speak, photo consent, management bait. No posting quota |
| Bargaining lifecycle | `/guide/bargaining` | Legal clock: conciliation, strike vote, No Board, ratification |

## Product rules

- High-level steward/officer handout. Not legal advice. Staff Rep confirms Act / constitution / strike protocol.
- No apps, posting quotas, or invented strike-pay amounts.
- Unauthorized stoppages put members at risk — same claim as bargaining.
- Public rhythm is sparse, approved, captains first. Crisis owns who may speak.
- Do not use Portal “Hold the line” as a strike heading.
- No Graphic Maker / Brand Kit tutorials in the strike **body** (aside/footer only).
- Mega-menu “Strike operations” never points at crisis. Crisis stays on Resources comms + related links.

## Architecture

- i18n namespace `strikeOpsGuide`; copy guards via `PUBLIC_NS`.
- Primary discoverability group: `GUIDE_REGISTRY.bargaining`. Also labour resources + steward playbooks.
- Sources `pageId="strike"` — statute/federation list, not crisis’s OPSEU-portal-heavy set.
- Diagram: `StrikeCommandDiagram` (executive → committee → captains → members).
- Officer Learning module 6 (`building-collective-power`) related resources include `/guide/strike`.

## Agent habits

- Do not restore “three messages a day” or label `/guide/crisis` as Strike Guide.
- Do not add strike-pay software or a Home/hero CTA for this page.
- Confirm dates and pay rules with servicing — this page never announces a start date.
