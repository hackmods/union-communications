# Session knowledge — 2026-08-20 (Org Chart)

**Audience:** future agents + Ryan.
**Companion:** [`current-ground-truth.md`](current-ground-truth.md), [`../modules/COMMS.md`](../modules/COMMS.md).

## What shipped

Public Comms **Org Chart** at `/tools/org-chart`:

- On-device `PublicRoster` (`unionops-public-roster`) — officers, stewards, optional committees. Not Hub `/app/officers` (emails/terms/MFA). Not a membership directory (ADR-016).
- Letter/tabloid poster (PNG + PDF) via `ToolEditorLayout` + Brand Kit canvas tokens.
- JSON (canonical) + CSV import/export so a local can update names after elections.
- Website Template one-shot seeds from `showOnWebsite` people; **Use Org Chart names** refreshes later. Website ZIP officers stay a flat card grid.

## Product language

- EN locked name: **Org Chart**. FR: **Organigramme**.
- Editor label: **Officers and stewards** — never “member list.”
- Default `showOnWebsite: true` for executive, `false` for stewards/committees.

## Do not

- Pipe Hub officer emails/phones into public Comms.
- Add photos (consent) or a drag-drop graph library.
- Sync the roster through `ApiAdapter` / `DataAdapter`.
- Invent a fifth Tools column for this; it lives under **Union boards**.
