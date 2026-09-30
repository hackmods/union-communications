# Officer Learning quiz authoring

The current 17 Officer Learning quizzes assume the Ontario context used by their associated modules. Keep every answer within that scope; when a rule depends on a collective agreement, constitution, bylaws, policy, or jurisdiction, preserve that qualification. A future jurisdictional version needs its own source review.

## Authoring checks

- Keep six questions per module unless the module owner records a deliberate exception. Give each `### Question N` its stable module-local number; do not renumber questions just to change option order.
- Author four non-empty options (`A`–`D`) and exactly one correct answer. Option order is fixed in the source and is not shuffled at runtime. Vary the correct position naturally: do not reuse one position by habit. The quiz-bank test fails if a position is unused, bank-wide share falls below 15% or exceeds 40%, a module uses one position more than three times, or three consecutive answers match.
- Make each wrong option a mistake a new steward or rushed officer could actually make. Avoid joke choices and keep options reasonably parallel.
- Feedback should confirm the principle and explain why the tempting mistake fails when that helps the learner. Avoid feedback that only repeats the keyed answer. If feedback names an option letter, recheck that reference after changing option order; preferably describe the misconception instead.
- Before adding a question, compare its scenario and decision with the bank. Repeating a principle is useful when the situation or judgment changes; reusing the same props and decision is not.
- Keep legal and factual language as qualified as the associated lesson and its sources. Do not turn “generally,” “typically,” or “subject to the CA/bylaws” into a universal rule. If the lesson does not support an answer, improve its source or change the question.
- Update both English and French quizzes together. Keep question counts and correct positions aligned, and check that the French teaches the same claim.

Run `npm run test:quiz-bank` after editing authored quizzes. It checks schema shape, answer-key distribution, question counts, duplicate normalized stems, English/French key alignment, and self-test label consistency.
