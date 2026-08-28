# Session knowledge — Running meetings & Rules of Order (2026-08-28)

## What shipped

Public **gold-standard** parliamentary procedure module — not Hub `/app/meetings` (calendar/RSVP).

| Surface | Path | Role |
|---------|------|------|
| Full guide | `/guide/running-meetings` | Blueprint + steward playbooks — formality, Chair, quorum, agenda, motion life, precedence diagram, debate, voting, failures, worked GMM scenario |
| Mini cheat sheet | `/tools/rules-of-order` | 14 actions in 3 categories (Motions / Points / Meeting) — search, filter chips, sticky card, copy phrase, chair notes |
| Pocket PDF | Guide + OL module 4 | `RunningMeetingsReferenceSheetButton` → `downloadQuorumMotionPdf` |

## Architecture choices

- **Data:** `src/lib/rules-of-order/actions.ts` — single source for action ids + categories; i18n holds all copy (`rulesOfOrder.actions.*`).
- **Diagrams:** `MotionPrecedenceDiagram` + reused `QuorumTiersDiagram` from `StewardGuideDiagrams.tsx` (OL diagram labels via `officerLearning.diagrams`).
- **Officer Learning:** `MODULE_RELATED_RESOURCES["democratic-governance"]` leads with running-meetings + rules-of-order before bylaws.
- **Not canvas:** Reference tool uses `PageShell` + sticky card — not `ToolEditorLayout` / export handler pattern.

## i18n keys

- `runningMeetingsGuide` — full playbook namespace
- `rulesOfOrder` — tool namespace; detail fields: `whatToSay`, `hint`, `canInterrupt`, `needsSeconder`, `isDebatable`, `voteRequired`, `chairNote`
- `nav.rulesOfOrder`, `nav.runningMeetingsGuide`
- `officerLearning.related.links.runningMeetings`, `rulesOfOrder`

## Tests

- `src/lib/rules-of-order/actions.test.ts` — category coverage
- `e2e/steward-tools.smoke.spec.ts` — tool + guide axe smoke
- Copy guards: `runningMeetingsGuide` + `rulesOfOrder` in `PUBLIC_NS` (`copy-namespaces.ts`)

## Agent habits

- Confirm local bylaws / standing orders before citing thresholds — guide disclaimer is mandatory.
- Do not hardcode OPSEU meeting rules; Robert's Rules is reference procedure only.
- When adding actions, update `RULES_OF_ORDER_ACTION_IDS`, categories, EN+FR `rulesOfOrder.actions`, and `actions.test.ts`.
- Cross-links: bylaws guide + board-notice + bylaw-builder → running-meetings / rules-of-order; steward playbooks `pathSteps` includes both.

## Related

- Officer Learning module 4 (`democratic-governance`) — quorum-motion PDF still canonical printable; guide links to it.
- Bylaws guide — quorum tiers diagram shared; precedence is running-meetings-specific.
