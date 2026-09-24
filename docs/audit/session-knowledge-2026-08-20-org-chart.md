# Session knowledge — 2026-08-20 (Org Chart)

**Audience:** future agents + Ryan.
**Companion:** [`current-ground-truth.md`](current-ground-truth.md), [`../modules/COMMS.md`](../modules/COMMS.md).

## What shipped

Public Comms **Org Chart** at `/tools/org-chart`:

- On-device `PublicRoster` (`unionops-public-roster`) — officers, stewards, optional committees. Not Hub `/app/officers` (emails/terms/MFA). Not a membership directory (ADR-016).
- Letter/tabloid poster (PNG + PDF) via `ToolEditorLayout` + Brand Kit canvas tokens.
- Roster backup moved to **Local pack** (`/tools/local-pack`) — versioned JSON with Brand Kit + preferences + website draft; CSV for Excel remains on that page. Org Chart no longer has its own JSON/CSV import/export.
- Website Template one-shot seeds from `showOnWebsite` people; **Use Org Chart names** refreshes later. Website ZIP officers stay a flat card grid.

## Product language

- EN locked name: **Org Chart**. FR: **Organigramme**.
- Editor label: **Officers and stewards** — never “member list.”
- Default `showOnWebsite: true` for executive, `false` for stewards/committees.

## 2026-09-14 — Fit extra people

Letter is a fixed 850×1100 sheet with `overflow: hidden`. Card chrome used
`designWidth / 306` (~2.8×) after Canvas Core, so a 7-person poster clipped
committees. Density now comes from `orgChartChromeScale` (letter = 1.0 base)
plus a measure-and-fit scale on the roster stack.

## Do not

- Pipe Hub officer emails/phones into public Comms.
- Add photos (consent) or a drag-drop graph library.
- Sync the roster through `ApiAdapter` / `DataAdapter`.
- Invent a fifth Tools column for this; it lives under **Union boards**.
