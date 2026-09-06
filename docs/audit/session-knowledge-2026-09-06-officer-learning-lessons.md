# Lessons learnt — Officer Learning modules 11–14 (2026-09-06)

**Audience:** Ryan + future agents.  
**Companion ship log:** [`session-knowledge-2026-09-06-officer-learning-modules-11-14.md`](session-knowledge-2026-09-06-officer-learning-modules-11-14.md)  
**Prior wave:** [`session-knowledge-2026-09-06-officer-learning-modules-7-10.md`](session-knowledge-2026-09-06-officer-learning-modules-7-10.md)  
**Uplift audit playbook (next session):** [`plan-2026-09-06-officer-learning-system-uplift.md`](plan-2026-09-06-officer-learning-system-uplift.md)

---

## What this wave taught

Shipping modules 11–14 to fourteen total, then reviewing 7–14, exposed the same class of risk the public-copy QOL pass found: **structural green ≠ floor-ready meaning**. The container (catalog, parse, progress, PDFs, SEO) is mature. The residual risk is **semantic** — quiz prompts that name the wrong legal term, French calques, and peer-module overlap that reads as duplication unless differentiation is explicit in the lesson and the related-resource wiring.

---

## Hard lessons (do not re-learn)

### 1. Cover filenames lie — map by theme

Gemini (and similar) exports often swap or mislabel files (`module11_cover` can be the “SECURE DATA” server art). Production mapping must follow **visual theme → module topic**, not the download name. Always strip the Gemini Notebook watermark (paint-match navy over the bottom-right tag) before `sharp` → webp. Spot-check the webp with vision before commit.

### 2. Syllabus quizzes need a fourth distractor and letter parity

Upstream guides ship A–C. The parser and UX require **A–D**. Add a fair D distractor without inventing a second correct answer. After EN+FR write, assert **Correct Answer letters match** (`parse-module.test.ts` already does this for every catalog module — keep it green).

### 3. Quiz prompt must name the same concept as the correct option

Module 8 asked about “Without Prejudice” while answer A and the explanation described **Without Precedent**. Key parity and letter parity were both green. Content review must read **prompt ↔ correct option ↔ explanation ↔ teaching section** as one claim chain, not three separate strings.

### 4. EN/FR claim parity is a meaning audit, not a key audit

Module 11 FR had `notoriously désordonnées` and `bonne standing` — readable to a bilingual editor, wrong for floor French. Same rule as [`i18n-public-copy.mdc`](../../.cursor/rules/i18n-public-copy.mdc): read the English *claim* beside the French value.

### 5. Differentiation belongs in three places, not one

For each advanced module, state what it is **not**:

| Place | Example |
|-------|---------|
| Lesson intro / How to use | “Pair with X; this module owns Y” |
| Related resources | Link the peer guide/module explicitly |
| Guide callout | Membership signup → Module 11 (lists), not only Module 6 |

Without all three, agents and stewards rebuild Module 5/6/ signup playbooks inside 11–14.

### 6. Count copy is a product surface

“Ten modules” lived in nav blurbs, SEO, certificate path title, steward playbooks, smoke regexes, and FR leftovers (`ten modules` untranslated). When the catalog grows, grep both locales for the old count **and** update smoke-asserted copy in the same change.

### 7. Dashboard chrome scales by grid, not flex

At ten modules, `LearningPathDiagram` used `lg:grid-cols-5` (5×2). At fourteen, `lg:grid-cols-7` (7×2). Do not squeeze fourteen steps into one flex row. Re-check title truncation on real card titles after any catalog growth.

### 8. Wiring checklist is longer than the markdown

A “full” module is not just EN+FR `.md`. Missing any of: catalog id/slug, related sheets + PDF writer + switch case, `ReferenceSheetId` union, diagram + timeline + i18n keys, SEO EN/FR, sitemap, `PAGE_SOURCE_IDS`, content-review label, What’s new, hub `readModuleN`, smoke spot-check → silent holes (empty related panel, 404 SEO throw, incomplete path).

### 9. Legal caution must stay jurisdiction-honest

Ontario LRA mid-term strike framing (M7), CRA/T4A without hardcoded dollar thresholds (M12), and “Membership List Directive” as cross-union practice rather than one national clause name (M11) are intentional. Uplift work should **hedge and point to counsel / national constitution**, not invent precision that ages badly.

### 10. Parallel agents write content; the parent owns integration

Subagents are good for long EN+FR lessons. The parent must still own covers, catalog, i18n counts, SEO band (FR ≤165 chars), French typography (` ;`), tests, and the content-review pass. Do not mark the goal done when markdown exists but the path still says “ten.”

### 11. PowerShell is hostile to HEREDOC / multiline node -e

On Windows shells, prefer a short `scripts/tmp-*.mjs` for bulk JSON and image work, then delete before commit. Same lesson as the public-copy QOL pass.

---

## What is already strong (do not rebuild)

- Single progress store: `unionops-officer-learning-progress`
- Markdown → sections/quiz/checklist via `parse-module.ts` with mechanical gates
- Pocket PDFs through `text-pdf-layout` / education footer
- OL dark shell + `olTheme` (platform orange) exception
- Module routes exempt from guide-registry coverage (hub `/guide/officer-learning` only)
- Unit tests that walk **every** catalog module for parse, related sheets, timelines

---

## Residual risks left for a system uplift

1. **Modules 1–6** did not get the same 2026-09-06 content-review depth as 7–14.
2. **Without prejudice** is taught in M8 but no longer quizzed after the prompt fix.
3. **Historical What’s new** rows still say “Six bilingual modules” (correct for that day — do not rewrite history into fourteen).
4. **Diagram / timeline i18n** can drift from lesson tables if only one side is edited.
5. **14-step path** readability on mid-width laptops (between mobile stack and `lg`) is unproven in smoke.
6. No mechanical guard yet for “quiz prompt keyword ⊆ correct option / section heading” claim chains.
7. FR quiz labels sometimes use `*Explanation*` instead of `*Explication*` (parser accepts both; voice is inconsistent).

---

## Pasteable opener for the uplift session

Use the plan file below as the `/goal` body, or paste:

> Audit and uplift the Officer Learning **system** (modules 1–14 + dashboard/chrome), not add module 15. Follow `docs/audit/plan-2026-09-06-officer-learning-system-uplift.md`. Evidence-first; no redesign of the markdown architecture unless a checklist item fails.
