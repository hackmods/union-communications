# Session knowledge — Learn content polish (2026-09-28)

## Source

Content & source audit pack (`LEARN_*` + OPSEU Enhancements). Waves 1–5 shipped in-repo; **Wave 6 OPSEU opt-in layer deferred** — backlog lives only in the audit folder:

- `OPSEU Enhancements/README.md`
- `OPSEU_LEARNING_RESOURCE_PLAN.md`
- `OPSEU_CONTENT_CUSTOMIZATION_RECOMMENDATIONS.md`
- `OPSEU_VERIFIED_LINKS.md`

Binding: OPSEU materials are opt-in education, never core doctrine defaults.

## Shipped (core)

- OHRC bibliography URL → `/ontario-human-rights-code`; OL markdown synced.
- Bylaws: OPSEU/SEFPO **President** (not National President); demo Local 243 framing.
- Callouts: photo-consent → Module 11; union-boards callout removed; land-ack → Module 6; Module 7 focus leads on bargaining/strike/crisis.
- Joint-committee gate qualified (EERC vs JHSC/LMC parallel).
- Modules 15–17 `SOURCES_PAGE_BY_SLUG` + static params via `module-sources.ts`.
- WCAG 2.2 source id; catalog Brand Kit filtered result copy; resources `linkRotNote`.
- Quiz/body hedges (Modules 1–6, 8–9, 11); redundant Q5 differentiation (M4 tiled doors, M5 e-transfer).
- What’s new: `learn-content-trust`.

## Follow-up polish (same day)

- Finish canonical `/learn` sweep: OL dashboard/quiz, guide relatedLinks, OL markdown peer paths.
- `dedupeRelatedByHref` now emits `canonicalizePublicHref` so `/guide/*` and `/learn/*` collapse.
- Land-ack OPSEU event-order claims hedged (FC-016).
- JJEC + College Bumping first-use glossary cues.

## Rejected / deferred

- CONT-009 remove Document Generator CTAs (crash fixed — keep + smoke).
- ED-001 TEST-101 as published content (Brand Kit localStorage).
- Wave 6 OPSEU UI layer.
- LMS certificates / labour primary-nav / full playbook PDFs.

## Verify

```bash
npm run test:unit -- src/lib/officer-learning/module-sources.test.ts src/lib/officer-learning/related-resources.test.ts src/lib/bylaws/build-template.test.ts src/lib/constants/comms-sources.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts
node scripts/check-external-links.mjs
```
