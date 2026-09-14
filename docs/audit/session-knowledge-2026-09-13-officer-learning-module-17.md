# Session knowledge — Officer Learning Module 17 (2026-09-13)

**Audience:** future agents + Ryan.  
**Prior catalog:** [`session-knowledge-2026-09-06-officer-learning-knowledge-expansion.md`](session-knowledge-2026-09-06-officer-learning-knowledge-expansion.md)  
**Jurisdiction hedges:** [`officer-learning-jurisdiction-hedges.md`](officer-learning-jurisdiction-hedges.md)

---

## What shipped

Catalog is now **seventeen** modules.

| # | slug | Route | Focus |
|---|------|--------|--------|
| 17 | `pdf-classification` | `/guide/officer-learning/pdf-classification` | Position Description Forms (PDF), duty-frequency logs, Employee Comments, JJEC / classification grievance |

Short URL `/guide/pdf-classification` **308-redirects** to the Officer Learning module. There is **no** standalone GuideLayout playbook (unlike `/guide/dfr` + M15 or `/guide/seniority-bumping` + M16).

Progress stays in `unionops-officer-learning-progress` under `module-17`. Do **not** add a second `unionops_module_17_completed` key.

Cover: `public/assets/officer-learning/module-17.webp` (Gemini Notebook watermark paint-matched navy before webp). Theme is form + scale — map by art, not by the download filename.

Steward track includes 17. Officer / mobilize unchanged.

---

## Differentiation

| Module | Owns | Does not own |
|--------|------|----------------|
| 17 PDF / reclass | PDF audit, duty logs, Employee Comments, pay-band / JJEC file | Seniority lists or bumping trees (M16); general JHSC/LMC forums (M10); FAR intake (M1); settlement wording (M8) |
| 16 Seniority | Lists, CA bumping trees, layoff clocks | Job-evaluation point factors or PDF comments |
| 10 Joint committees | JHSC / LMC caucus discipline | Job-eval panel procedure |

---

## Hedges

Review windows (“typically 10–15 working days”) and JJEC existence are **CA-specific**. Point-factor cluster names vary by plan. Do not invent a grid or a statutory day count.

---

## Verify

```bash
npm run test:unit -- src/lib/officer-learning/claim-chain-guards.test.ts src/lib/officer-learning/diagram-timeline-i18n.test.ts src/lib/officer-learning/modules.test.ts src/lib/officer-learning/parse-module.test.ts src/lib/officer-learning/related-resources.test.ts src/lib/officer-learning/module-timeline.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts src/lib/comms/smoke-asserted-copy.test.ts
```

Smoke: `e2e/officer-learning.smoke.spec.ts` (Seventeen… nav + Module 17 card).
