# Session knowledge — Strike operations playbook (2026-09-05)

## What shipped

Split the old “Strike Guide” nametag from Crisis Comms.

| Surface | Path | Role |
|---------|------|------|
| Strike operations | `/guide/strike` | Kits, gate coverage from numbers, captain training (talking, chants, QR flyers), member care, money, safety, two rhythms, visiting another line, return to work. Principle-level; lawful coverage only |
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
- Diagrams: `StrikeCommandDiagram` (executive → committee → captains → members); `StrikeRhythmsDiagram` (internal huddle → captains first → sparse public note); `StrikeGatesDiagram` (main / side / dock).
- Floor handout: captains' standing brief on-page checklist + printable PDF (`downloadStrikeStandingBriefPdf`). No amounts or posting quotas on the sheet. Kit, door map, early open, and QR flyers live on the page checklist; keep the PDF one page.
- Captain training is on the playbook: night-before walk, talking scripts, original call-and-response only (no copyrighted anthem lyrics), QR flyers to the local strike page. Tools (Flyer Maker, QR Link Cards, Website Template) stay in aside/footer plus the captain section CTAs.
- Visiting another line is distinct from community allies: call their coordinator, named gate, follow their captain, do not speak or film for them.
- Cover-every-door tactics (early open, longer hold on the live door, move bodies the same hour) are lawful picket coverage. Do not title this guerrilla warfare. Not a blockade, wildcat, or occupy-a-lot manual.
- Officer Learning module 6 (`building-collective-power`) related resources include `/guide/strike`.

## Agent habits

- Do not restore “three messages a day” or label `/guide/crisis` as Strike Guide.
- Do not add strike-pay software or a Home/hero CTA for this page.
- Confirm dates and pay rules with servicing — this page never announces a start date.
- Gold-standard labour depth (checklist + printable brief + second diagram) stays `tier: "playbook"` in `GUIDE_REGISTRY`. Do not retag as Comms `gold`.
