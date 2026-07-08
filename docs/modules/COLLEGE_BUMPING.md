# College Bumping Module

## Status: Phase 3 MVP (shipped)

**Sector-optional** — enabled per union/division (`enabledModules: ["bumping"]`). Post-secondary colleges only; other unions never see this module.

## Entities

### BumpingCase
- `id`, `unionId`, `localId`
- `memberId`, `seniorityDate`, `currentPosition`, `scenario`

### PositionComparison
- Two position descriptions (PDF or structured fields)
- Side-by-side diff metadata

### CommitteeSession
- Stability committee meeting: date, attendees, agenda

### CommitteeNote
- Shared notes with version history

### DecisionRecord
- Outcome, rationale, dissent notes
- Exportable for local records

## Features

- PDF upload and side-by-side viewer
- Diff highlights: duties, qualifications, seniority markers
- Configurable comparison checklist (not legal advice)
- Decision log export

## Access

- `stability_member` and `local_president` — full write
- `local_steward` — read only
- MFA required

## Disclaimer

Checklist templates assist committee process. Not legal advice. Locals must follow their collective agreement and consult national rep.
