# Learn quiz remediation ledger

**Date:** 2026-09-30 · **Scope:** 17 Officer Learning quizzes, English/French source, shared widget, and authoring checks.

| Finding | Status | Implementation and verification | Remaining concern |
|---|---|---|---|
| KEY-001 | DONE | Current source before changes: 103 answers, A6/B79/C18/D0 (the 2026-09-29 capture had B80/C17). Static authored reorder leaves 102 answers at A26/B25/C26/D25. `quiz-bank.test.ts` enforces 15–40% bank share, no unused position, max three per six-question module, and no three-answer run. | None. |
| DUP-1 | DONE | M4 Q3 now gives the local's successive-balloting rule; Q5 tests late entry after doors are tiled. The captured duplicate is absent in current source. Reviewed M4 EN/FR and answer sequence. | Follow each local's own election rules. |
| DUP-2 | DONE | Current M5 Q2 keeps the blank-cheque case; Q5 is the distinct single-signer e-transfer under vendor pressure. Reviewed M5 EN/FR and its dual-control lesson. | None. |
| ABS-1 | DONE | M8 Q3 now says verbal settlement terms are generally unenforceable and directs unusual cases to counsel. Feedback matches the lesson's qualifier. | None. |
| ABS-2 | PARTIAL — HUMAN REVIEW | M5 Q4 now asks whether a $500 candidate-campaign payment is authorized under the local constitution/election rules and available fund; it states no universal dollar rule. | M5 names constitution/election law generally but cites no specific political-spending authority. The quiz avoids a universal ban; source/counsel review is still needed before making a broader legal claim. |
| DUP-3 | DONE | M3 Q3 remains the canonical full-file privacy question; M9 Q1 is now an LTD denial/appeal scenario. M3 Q5 is a lower-paid out-of-unit RTW offer. Reviewed against each module's lesson. | None. |
| PRIV-CLUSTER | DONE | M3 Q5 tests task bundling and bargaining-unit status; M9 Q2 tests fact-specific IME scrutiny; M9 Q6 tests concurrent LTD and AMP steps. These differ from the retained M3 full-file question. | None. |
| DUP-4 | DONE | M11 retains the work-boot discount case. M14 Q2 now tests a sign-up-sheet photo in a large member chat. Reviewed privacy feedback in both locales. | None. |
| FB-001 | DONE | Kept the widget's single `explanation` field because a two-field schema added little value here. Improved high-risk explanations to name/rebut the tempting misconception; the widget continues to show the explanation for right and wrong selections. | No separate per-option coaching. |
| TRAP-001 | DONE | M15 Q3 explicitly rebuts the volunteer-exemption misconception in its feedback. | None. |
| DIST-001 | DONE | Replaced the flagged comic choices: M5 Q6 addresses verbal approval; M10 Q2/Q4 use plausible committee/process mistakes; M13 Q6 includes the password-protected employer SharePoint trap. The M8 item was removed with the weak question. | None. |
| META-001 | DONE | Replaced M9 Q5 with an LTD delay case, M12 Q4 with hardship-ledger privacy, and M14 Q5 with coalition-boundary judgment. | None. |
| ABS-3 | DONE | M4 Q2 now says the motion was not validly adopted and points to challenge/ratification procedures in the bylaws. | None. |
| ABS-4 | DONE | M1 Q2 protects vigorous representation while explaining that personal abuse can make immunity arguable; it rejects a violence-only rule. | None. |
| TITLE-001 | DONE | The shared UI label is `Self-test` in English (`Autoévaluation` in French); the bank test and E2E assert the rendered label. | None. |
| STRUCT-001 | DONE | Removed M8's weak chronological fact-sheet item and folded the useful chronology point into Q1 feedback. M8 now has six questions. | None. |
| JURIS-001 | DONE | `src/content/officer-learning/QUIZ_AUTHORING.md` states the current Ontario context and requires source review before jurisdictional expansion. | None. |
| VERIFY-001 | DONE | M16 Q5 option D is clean in source and was verified on the rendered module page by Playwright. | None. |
| ORDER-001 | DONE | The current M4 ballot questions use different procedures; the duplicate order clue is absent. The answer distribution test also checks each module sequence. | None. |
| ECHO-001 | DONE | M14 Q4 explains signed-card voting eligibility and dues-deduction limits on its own, without requiring prior completion of M11. | None. |

## Verification

- `npm run test:quiz-bank`: **4 passed**; covers all 17 quizzes in both locales, six questions each, four valid options, one resolving key, feedback/stems, EN/FR key alignment, normalized exact-duplicate stems, label casing, and answer distribution.
- Final focused unit run, `npm run test:unit -- src/lib/officer-learning src/lib/constants/updates.test.ts`: **19 files / 83 tests passed**, including `quiz-bank.test.ts`, parser tests, and the update catalog.
- Focused Playwright run against the isolated workspace server at `http://localhost:3001`: `npm run test:e2e -- --workers=1 e2e/officer-learning.quiz.audit.spec.ts`, **4 passed**; all 17 quizzes render and score, feedback appears after submission, completion saves and resets for retest, and M16 Q5 renders cleanly.
- Programmatic final audit: **17 quizzes / 102 questions**, A 26 (25.5%), B 25 (24.5%), C 26 (25.5%), D 25 (24.5%); six questions per module; no exact duplicate stems or module above three of one key position. Per-module sequences are in the task completion report.
- Full `npm run test:unit` earlier in the pass: **505 passed, 48 failed, 2 skipped, 1 todo**. Failures are in unrelated outreach, finance/travel, migration-journal, caption, and French-copy checks. After the final quiz text edits, all 19 Officer Learning/update test files were rerun: **83 passed**.
- `npm run typecheck` and `npm run build` compile application code, then stop on existing TypeScript errors in E2E fixtures, broadcast, observability, email, role tools, and local-move. No diagnostic names a changed quiz file. `npm run lint` reports its ESLint bypass because the repository's TypeScript 7 is unsupported by typescript-eslint.
