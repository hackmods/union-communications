# Session knowledge — 2026-08-25 (Comms re-launch hardening)

**Companion:** [`comms-four-width-qa-matrix-2026-08-25.md`](comms-four-width-qa-matrix-2026-08-25.md), [`public-tools-parity-audit-2026-08-25.md`](public-tools-parity-audit-2026-08-25.md).

---

## Shipped

| Area | Change |
|------|--------|
| Pulse Poll | Removed duplicate `ToolExportActions` from form body; Officer Hub sign-in Callout + `/app/login` link in toolbar; EN/FR `hubSignIn*` keys |
| Website Template | Hero / About / Contact / Brand Kit links collapsed via `ToolFormDetails`; office address default empty with i18n placeholder (no North Pole demo) |
| Meeting Background | Headline + preset stay visible; lead-in/closer in `sectionOptionalCopy`; design/orientation/layout in `sectionLayout` |
| Board Banner | Banner design + trim preview/corner collapsed via `ToolFormDetails` |
| Export fidelity | `org-chart` added to PNG preview↔capture matrix |
| Docs | Four-width QA matrix for all 17 tools + `/tools` |

---

## Lessons

1. **TEL export belongs on Preview only** — duplicating `ToolExportActions` in the form body violates mobile Preview-tab contract and adds scroll on phone.
2. **Hub-gated tools need launch copy in chrome** — Pulse Poll publish fails closed without session; toolbar Callout beats burying auth in form amber box alone.
3. **Website defaults must not joke on export** — empty office address + placeholder is safer than hardcoded demo addresses stewards might ship.
4. **Meeting/Banner density = collapse secondary SegControls** — keep one primary copy field (headline / mode) above the fold at 375.

---

## Deferred (post-launch)

- `/tools` Start-here accordion on mobile (catalog buried under roadmap steps)
- Pulse Poll single-choice question UI
- Document Generator TEL migration
- Full manual screenshot pass at four widths (matrix is structural)
