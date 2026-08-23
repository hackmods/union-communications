# Session knowledge — 2026-08-23 (Org Chart QOL + LEC Doc Gen)

**Audience:** future agents + Ryan.
**Companion:** [`session-knowledge-2026-08-20-org-chart.md`](session-knowledge-2026-08-20-org-chart.md), plan Org Chart QOL (do not edit the plan file).

## Layouts (2026-08-23 follow-up)

Three SegControl options on Org Chart:

| Id | Canvas |
|---|---|
| `poster` | Contact-card bands |
| `list` | Position \| Name table |
| `list-location` | Position \| Name \| Campus (short codes) — Local-243-style sheet |

Legacy `directory` coerces to `list-location`. Location column is **not** shown on plain List.

## Two surfaces, two jobs

| Surface | Job |
|---|---|
| **Org Chart** (`/tools/org-chart`) | Live on-device `PublicRoster` → board PNG/PDF (**poster** bands or **directory** table) |
| **Document Generator** (`lec-directory`) | Empty branded Word/Excel skeleton — fill offline after elections |

**No data sync either direction.** Doc Gen must never import `PublicRoster`, Hub officers, or member PII.

## Org Chart uplift

- Layout SegControl: `poster` | `directory`
- Formats: letter + tabloid, portrait + landscape (`org-chart-formats.ts`)
- Directory rows: `directoryRowsFromPeople` — executive roles, stewards share one position label then blank continuations, optional `(FT)`/`(PT)` via `unit`
- Editor: group sections with in-section Add; Name|Role|Location visible; group/unit/website/reports-to under **More options**

## Doc Gen `lec-directory`

- Fields are chrome only: term years, subtitle, office email/phone/address
- Placeholder positions in DOCX/XLSX builders — not a live member list
- Deep link: `/tools/document-generator?preset=lec-directory`

## Do not

- Export Word/Excel **from** the Org Chart roster (explicitly dropped)
- Photos on Org Chart
- Treat Doc Gen as a roster sync tool
