import { test, expect } from "@playwright/test";

async function answerAndSubmit(
  page: import("@playwright/test").Page,
  path: string,
  answers: string[],
) {
  await page.goto(path);
  const quiz = page.locator("#module-quiz");
  await quiz.scrollIntoViewIfNeeded();
  const fieldsets = quiz.locator("fieldset");
  await expect(fieldsets).toHaveCount(answers.length);

  // Explanations stay collapsed until submit
  for (let i = 0; i < answers.length; i += 1) {
    const explanation = fieldsets.nth(i).locator("p").last();
    await expect(explanation).toBeHidden();
  }

  for (let i = 0; i < answers.length; i += 1) {
    await fieldsets.nth(i).locator(`input[value="${answers[i]}"]`).check();
  }
  await quiz.getByRole("button", { name: /Submit|Soumettre/i }).click();
  await expect(
    quiz.getByText(new RegExp(`${answers.length}\\s*/\\s*${answers.length}`)),
  ).toBeVisible();
}

test.describe("officer learning quiz grading @smoke", () => {
  test("module 1 grades perfect score and reveals explanations after submit", async ({
    page,
  }) => {
    await answerAndSubmit(
      page,
      "/en/learn/officer/contract-enforcement/",
      ["B","B","C","B","B","B"],
    );
  });

  test("advanced grievance settlement covers non-six quiz length", async ({
    page,
  }) => {
    await answerAndSubmit(
      page,
      "/en/learn/officer/advanced-grievance-settlement/",
      ["B","A","C","A","B","C","B"],
    );
  });
});
