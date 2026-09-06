# Session knowledge — Officer Learning knowledge expansion + UX (2026-09-06)

**Audience:** future agents + Ryan.  
**Prior uplift:** [`session-knowledge-2026-09-06-officer-learning-system-uplift.md`](session-knowledge-2026-09-06-officer-learning-system-uplift.md)  
**Jurisdiction hedges:** [`officer-learning-jurisdiction-hedges.md`](officer-learning-jurisdiction-hedges.md)

---

## What shipped

Catalog is now **sixteen** modules:

| # | slug | Focus |
|---|------|--------|
| 15 | `duty-of-fair-representation` | DFR/DRE process duty — investigate, communicate, clocks; deepen for `/guide/dfr` |
| 16 | `seniority-bumping-layoff` | Seniority lists, CA-specific bumping trees, notice clocks; deepen for `/guide/seniority-bumping` |

Also:

- Module 8 **Without Prejudice** quiz Q7 (EN+FR) — closes the residual after the precedent-only quiz
- Module 7 **Strike steward day-1** subsection (lawful window only; points to `/guide/strike`)
- Dashboard **role tracks** (Full / Steward craft / Local officers / Mobilize) + denser hero (2-col), prefs+Hub sync side-by-side, cards `2xl:grid-cols-4`
- Guide callouts: photo-consent→M3, union-boards→M5, crisis→M7; dfr→M15; seniority→M16
- Guards: Rand + T4A claim pairs; `diagram-timeline-i18n.test.ts`
- Count copy: fourteen→sixteen (OL only; Rules of Order “fourteen actions” unchanged)

---

## Differentiation

| Module | Not a rebuild of |
|--------|------------------|
| 15 DFR | `/guide/dfr` playbook — OL owns investigation/comms/clocks/escalation |
| 16 Seniority | `/guide/seniority-bumping` worksheets — OL owns list reading + tree discipline + accommodation collision flag → M3 |

---

## UX notes

- Tracks filter both the path diagram and the card grid; path still uses md 2 / lg 4 / xl 5.
- Hub sync panel sits beside progress prefs (not buried below a divider stack).
- Covers for 15–16: illustrated art shipped (scales→15, shields→16); Gemini Notebook watermark paint-matched before webp.

---

## Verify

```bash
npm run test:unit -- src/lib/officer-learning/claim-chain-guards.test.ts src/lib/officer-learning/diagram-timeline-i18n.test.ts src/lib/officer-learning/modules.test.ts src/lib/officer-learning/parse-module.test.ts src/lib/officer-learning/related-resources.test.ts src/lib/officer-learning/module-timeline.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts
```

Smoke: `e2e/officer-learning.smoke.spec.ts` (Sixteen… nav + cards through 16).
