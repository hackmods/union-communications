# COPY-005 — EN readability snapshot (2026-08-15)

**Status:** tooling shipped. Report-only; no CI fail ceiling.
**Command:** `npm run copy:readability`
**Metric:** Flesch–Kincaid Grade Level (dependency-free vowel-group syllables). EN only.
**Scope:** leaves under `PUBLIC_NS` / `HUB_NS` with more than 8 words.
**Caveat:** Ranking signal, not a school-grade SLA. The “~grade 8–10” phrase from the Aug 11 QOL mission brief was never a product rule — do not treat this report as enforcing it. Hub is informational (officer vocabulary legitimately denser).

Helpers: [`src/lib/comms/readability.ts`](../../src/lib/comms/readability.ts), namespaces: [`src/lib/comms/copy-namespaces.ts`](../../src/lib/comms/copy-namespaces.ts).

## First-run top offenders (public)

| Rank | Grade | Key |
|------|------:|-----|
| 1 | 20.9 | `rightToRefuseGuide.sections.reassignment.items.2` |
| 2 | 19.4 | `crisisGuide.scenarios.layoffs.items.4` |
| 3 | 19.4 | `unionBoardsGuide.materials.items.form82Desc` |
| 4 | 19.0 | `resources.subtitle` |
| 5 | 18.1 | `websiteGuide.include.skip.content` |
| 6 | 18.1 | `rightToRefuseGuide.sections.ontarioScope.items.1` |
| 7 | 18.1 | `unionBoardsGuide.whatToPrint.optional.content` |
| 8 | 17.8 | `resources.builtFrom.items.2` |
| 9 | 17.7 | `dfrGuide.sections.legalTest.items.1` |
| 10 | 16.7 | `unionBoardsGuide.whatToPrint.rotate.content` |

Legal/OHSA guide bullets and multi-clause skip lists dominate — expected. Optional follow-up: hand-edit the worst public tails; do **not** auto-rewrite from the score alone.

## Hub (informational)

`hub.demoHint` ranks first (~26.5) because demo emails/passwords inflate syllable density — ignore for voice work. Real Hub density lives in fund/portal/travel subtitles and grievance outcome hints.

## Follow-up (not this ticket)

- Hard CI ceiling on public grade > N — requires an explicit product decision.
- Hand rewrite of the public top 20 against steward voice (optional; separate PR).
- French scoring — out of scope permanently for this helper.
