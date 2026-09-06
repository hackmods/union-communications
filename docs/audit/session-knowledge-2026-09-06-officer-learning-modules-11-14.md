# Session knowledge — Officer Learning modules 11–14 + content review 7–14 (2026-09-06)

**Audience:** future agents + Ryan.  
**Lessons + next-session uplift plan:** [`session-knowledge-2026-09-06-officer-learning-lessons.md`](session-knowledge-2026-09-06-officer-learning-lessons.md), [`plan-2026-09-06-officer-learning-system-uplift.md`](plan-2026-09-06-officer-learning-system-uplift.md)

---

## What shipped (Phase A)

Four modules joined the Officer Learning Center (now **fourteen** total):

| # | `id` | `slug` | Focus |
|---|------|--------|--------|
| 11 | `module-11` | `membership-lists-privacy` | Rand vs signed card, Membership List Directive, dues reconciliation, secure storage |
| 12 | `module-12` | `advanced-local-finance` | GMM expense policy, taxable honoraria/T4A, hardship committee + dual signature |
| 13 | `module-13` | `digital-security-transitions` | Folder IA, retention schedules, cybersecurity, Officer Transition Checklist |
| 14 | `module-14` | `everyday-union-value` | Day-1 orientation, affinity without list share, community unionism |

Content: `src/content/officer-learning/module-{N}.md` + `fr/module-{N}.md`. Covers: `public/assets/officer-learning/module-{N}.webp` (Gemini Notebook watermarks removed; thematic map — filing cabinet→11, safe→12, SECURE DATA server→13, workers/% cards→14).

---

## Architecture (do not reinvent)

Same container as modules 1–10:

1. Catalog row in `src/lib/officer-learning/modules.ts`
2. Markdown parse via `parse-module.ts` (≥8 sections, ≥6 quiz Qs with A–D)
3. Progress in **one** key: `unionops-officer-learning-progress` → `module-11`…`module-14`
4. Related links + reference sheets in `related-resources.ts`
5. Pocket PDFs in `reference-pdf.ts` + switch in `ModuleRelatedResources.tsx`
6. Diagrams / timelines keyed by **slug**
7. SEO + `PUBLIC_PATHS` + `PAGE_SOURCE_IDS` + content-review labels
8. Card titles/summaries in `officerLearning.modules.{slug}` EN/FR

Dashboard path: `LearningPathDiagram` uses **lg 4-col / xl 5-col** grid at fourteen modules (not 7-col — titles overflowed). Compact cells `line-clamp-3` + `overflow-hidden`; mobile stack still single-line truncate.

---

## Differentiation (agents)

| Module | Not a rebuild of |
|--------|------------------|
| 11 Lists/privacy | `/guide/membership-signup` (campaign craft) — 11 is secretary reconciliation + list directive |
| 12 Advanced finance | Module 5 budgets/trustees — 12 is expense policy, honoraria tax, hardship governance |
| 13 Digital security | New — archives, retention, transitions (pairs with 11 on no employer storage) |
| 14 Everyday value | Module 6 equity/ADR — 14 is Day-1 orientation, affinity cards, community coalitions |

---

## Phase B content review (modules 7–14)

Reviewed EN+FR for claim parity, peer overlap, legal caution, quiz fairness, floor actionability.

**Fixed:**

- Module 8 Q2: prompt said “Without Prejudice” but answer described **Without Precedent** — aligned EN+FR wording to precedent (letter A unchanged).
- Module 11 FR: `notoriously` → `notoirement`; `bonne standing` → `statut en règle`.

**Clean:** Modules 7, 9–10, 12–14 on legal caution and peer alignment (M7 LRA; M11 Rand/list directive; M12 T4A/dual sign; M13 retention; M14 no list share).

**Human judgment leftovers:** M8 no longer quizzes “without prejudice” itself; List Directive / card rules vary by constitution; T4A dollar thresholds not hardcoded (correct).

---

## Cover art hygiene

Source Gemini Notebook PNGs carried a bottom-right watermark. Production webps must not show it — paint-match background over the tag before `sharp` → webp. Do not ship watermarked covers. Filenames from the generator may not match topic — map by **theme**, not filename.

---

## Verify

```bash
npm run test:unit -- src/lib/officer-learning/modules.test.ts src/lib/officer-learning/parse-module.test.ts src/lib/officer-learning/related-resources.test.ts src/lib/officer-learning/module-timeline.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts
```

Smoke: `e2e/officer-learning.smoke.spec.ts` (dashboard cards through 14 + “Fourteen…” nav copy).
