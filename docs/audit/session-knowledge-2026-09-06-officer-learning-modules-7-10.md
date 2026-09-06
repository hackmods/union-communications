# Session knowledge — Officer Learning modules 7–10 (2026-09-06)

**Audience:** future agents + Ryan.

---

## What shipped

Four modules joined the Officer Learning Center (now **ten** total):

| # | `id` | `slug` | Focus |
|---|------|--------|--------|
| 7 | `module-7` | `mobilizer-bargaining-partner` | Workplace map, escalation ladder, work-to-rule vs illegal strike (Ontario LRA) |
| 8 | `module-8` | `advanced-grievance-settlement` | Open-door wording, five-part file, without prejudice/precedent, four corners |
| 9 | `module-9` | `benefits-disability-claims` | Functional abilities privacy, JIC/insurer pressure, IME limits, AMP audits |
| 10 | `module-10` | `joint-workplace-committees` | JHSC vs LMC, united caucus, multi-committee escalation |

Content: `src/content/officer-learning/module-{N}.md` + `fr/module-{N}.md`. Covers: `public/assets/officer-learning/module-{N}.webp` (Gemini Notebook watermarks removed).

---

## Architecture (do not reinvent)

Same container as modules 1–6:

1. Catalog row in `src/lib/officer-learning/modules.ts`
2. Markdown parse via `parse-module.ts` (≥8 sections, ≥6 quiz Qs with A–D)
3. Progress in **one** key: `unionops-officer-learning-progress` → `module-7`…`module-10` (not separate `unionops_moduleN_progress` keys)
4. Related links + reference sheets in `related-resources.ts`
5. Pocket PDFs in `reference-pdf.ts` + switch in `ModuleRelatedResources.tsx`
6. Diagrams / timelines keyed by **slug**
7. SEO + `PUBLIC_PATHS` + `PAGE_SOURCE_IDS` + content-review labels
8. Card titles/summaries in `officerLearning.modules.{slug}` EN/FR

OL module routes stay **exempt** from guide-registry coverage (hub `/guide/officer-learning` only).

---

## Differentiation (agents)

| Module | Not a rebuild of |
|--------|------------------|
| 7 Mobilizer | Module 6 equity/ADR — 7 is worksite pressure + bargaining cycle tactics |
| 8 Settlement | Module 1 intake/FAR — 8 is trial-ready file + MOS four corners |
| 9 Benefits/disability | Module 3 Meiorin/BFOR — 9 is claims advocacy, privacy, AMP |
| 10 Joint committees | Module 4 GMM governance — 10 is JHSC/LMC caucus + multi-forum |

---

## Cover art hygiene

Source Gemini Notebook PNGs carried a bottom-right watermark. Production webps must not show it — paint-match background over the tag before `sharp` → webp. Do not ship watermarked covers.

---

## Dashboard path chrome

`LearningPathDiagram` must read cleanly at **ten** steps (grid, not a single squeezed flex row). See component comment.

---

## Verify

```bash
npm run test:unit -- src/lib/officer-learning/modules.test.ts src/lib/officer-learning/parse-module.test.ts src/lib/officer-learning/related-resources.test.ts src/lib/officer-learning/module-timeline.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts
```

Smoke: `e2e/officer-learning.smoke.spec.ts` (dashboard + one advanced module + “Ten…” nav copy).
