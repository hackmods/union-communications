# Plan — Officer Learning system uplift audit (next session)

**Status:** ready to run in a fresh chat  
**Date drafted:** 2026-09-06  
**Depends on:** modules 1–14 shipped; lessons in [`session-knowledge-2026-09-06-officer-learning-lessons.md`](session-knowledge-2026-09-06-officer-learning-lessons.md)  
**Goal shape:** system QOL / correctness uplift — **not** “add module 15” unless product asks

---

## Why a separate session

The 11–14 ship + 7–14 review fixed real bugs and closed the catalog gap. A **system** uplift needs a clean pass across all fourteen modules plus chrome: claim chains, peer overlap matrix, dashboard UX at 14, FR voice consistency, and optional new guards. That is too easy to redefine as “one more module” if mixed into authoring work.

---

## Success criteria (do not shrink)

1. Written audit findings for **modules 1–14** (EN+FR), with fixes for every **confirmed** issue (same bar as Phase B: real bugs only; no redesign).
2. Overlap matrix: each module vs nearest peer module **and** nearest public guide — complementary or fixed.
3. Dashboard / path / certificate / count copy still honest at fourteen; mid-width path readability checked.
4. Optional: one new mechanical guard that would have caught the Module 8 prejudice/precedent mismatch (or a documented reason it stays human-only).
5. Session knowledge + `docs/PROGRESS.md` updated; lint + OL unit tests green; commit + push.

---

## Session brief (paste into `/goal`)

```text
/goal Officer Learning system uplift audit (modules 1–14 + chrome).

Read first:
- docs/audit/plan-2026-09-06-officer-learning-system-uplift.md
- docs/audit/session-knowledge-2026-09-06-officer-learning-lessons.md
- docs/audit/session-knowledge-2026-09-06-officer-learning-modules-11-14.md
- src/lib/officer-learning/modules.ts, parse-module.ts, related-resources.ts

Do NOT add a new module. Do NOT redefine success as “polish one advanced module.”

PHASE 1 — Inventory & matrix
- Catalog every module id/slug/cover/related sheet/PDF/diagram/timeline/SEO/sources
- Build overlap matrix: M1–M14 × peer modules × public guides (membership-signup, grievance-process, joint-committee, bargaining, strike, running-meetings, bylaws, financial peers)
- Flag contradictions and silent duplication

PHASE 2 — Content claim audit (EN+FR for all 14)
For each module:
- Prompt ↔ correct option ↔ explanation ↔ teaching section (one claim chain)
- FR meaning matches EN (esp. legal terms: LRA, Rand, T4A, without prejudice/precedent, OHSA/LSST)
- Quiz: fair distractors; EN=FR letters; no double-correct
- Checklist ≥10 actionable; callouts have consequence + remedy where they warn
- Multi-union Ontario voice; no OPSEU-as-default; no placeholders

PHASE 3 — Chrome & progressive disclosure
- LearningPathDiagram at 14 (mobile stack, lg 4-col / xl 5-col, mid-width readability)
- Certificate pathTitle / nav / SEO / smoke count strings still “fourteen”
- Related resources + guide OfficerLearningModuleCallout pointing at the right deepen module
- Diagram/timeline i18n still match lesson tables

PHASE 4 — Fix + guard
- Fix confirmed issues surgically
- Prefer one new test/guard if cheap (e.g. quiz correct-option id present in prompt tokens is too naive — better: snapshot known legal term pairs, or assert prejudice≠precedent mismatch patterns)
- Update session-knowledge + PROGRESS; lint + unit tests; commit + push
```

---

## Recommended audit method (evidence order)

### A. Mechanical first (cheap)

```bash
npm run test:unit -- src/lib/officer-learning/modules.test.ts src/lib/officer-learning/parse-module.test.ts src/lib/officer-learning/related-resources.test.ts src/lib/officer-learning/module-timeline.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts
```

Then grep:

- Count drift: `Fourteen|fourteen|Quatorze|quatorze|Ten modules|ten modules|dix modules`
- Legal term pairs in quizzes: `Without Prejudice|Without Precedent|Sans préjudice|Sans précédent`
- Employer storage bans consistency: `OneDrive|Teams|employer`
- Progress key shape: only `module-N` ids in docs/examples (no `unionops_moduleN_progress`)

### B. Claim-chain pass (human / agent)

For each quiz question in each locale:

1. Read the **prompt** — which concept does it name?
2. Read the **correct option** — does it answer that concept?
3. Read the **explanation** — same concept?
4. Jump to the **teaching section** that owns the term — still consistent?

This is the pass that caught Module 8. Budget ~5–8 minutes per module once the pattern is familiar (≈2 hours for 14).

### C. Overlap matrix (product)

Fill a table (keep in the session-knowledge update):

| Module | Primary job | Must not rebuild | Peer guide | Verdict |
|--------|-------------|------------------|------------|---------|
| 1 | … | … | `/guide/grievance-process` | complementary / fix |
| … | | | | |

Verdicts allowed: `complementary`, `callout wrong`, `contradiction`, `duplicate — trim`.

### D. Chrome spot-check

- Desktop ~1280 and ~1536: path titles readable inside cards (`lg:grid-cols-4` / `xl:grid-cols-5`, line-clamp — never overlapping neighbours)
- Phone: stacked path + module card covers
- One advanced module smoke: jump to quiz, related PDFs present, timeline visible
- Certificate download copy still says fourteen
- Regression to watch: do **not** restore `lg:grid-cols-7` for fourteen modules without re-checking long titles (Human Rights, Advanced Grievance, Joint Workplace Committees)

### E. Optional guard ideas (pick ≤1 per session)

| Idea | Catches | Cost |
|------|---------|------|
| Forbidden prompt/answer term mismatch list (prejudice vs precedent, Rand vs “automatic member”) | M8-class bugs | Low — table of pairs in a unit test over parsed quizzes |
| FR quiz must use `*Explication*` not `*Explanation*` | Voice drift | Trivial |
| Every module checklist `items.length >= 10` | Softening over time | Trivial (tighten existing ≥6) |
| Related-resources slug coverage already exists | Empty related panels | Already shipped |

Do **not** try to LLM-assert “FR means the same as EN” in CI — that belongs in the claim-chain pass.

---

## Out of scope (unless Ryan expands the goal)

- New modules 15+
- Replacing markdown architecture with a CMS
- Rewriting modules 1–6 for tone alone without a finding
- Changing progress to per-module localStorage keys
- Merging Officer Learning into guide-registry coverage

---

## Suggested commit shape when the uplift lands

1. `fix(officer-learning): …` — content/claim fixes  
2. `test(officer-learning): …` or `chore` — new guard if any  
3. Docs: session-knowledge + PROGRESS in the same or follow-up commit  

What’s new: only if stewards gain a visible capability (new sheet, new diagram behavior). Pure accuracy fixes usually skip `/updates`.

---

## Verify before calling the uplift done

```bash
npm run lint
npm run test:unit -- src/lib/officer-learning/modules.test.ts src/lib/officer-learning/parse-module.test.ts src/lib/officer-learning/related-resources.test.ts src/lib/officer-learning/module-timeline.test.ts src/lib/seo/public-page-meta.test.ts src/lib/constants/updates.test.ts src/lib/comms/public-copy-style.test.ts
```

Smoke when UI/chrome changed: `e2e/officer-learning.smoke.spec.ts`.
