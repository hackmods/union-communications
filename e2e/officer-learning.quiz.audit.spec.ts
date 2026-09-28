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
    const explanation = fieldsets.nth(i).locator("[data-quiz-explanation]");
    await expect(explanation).toHaveAttribute("aria-hidden", "true");
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
  test("quiz prompts render once per question (legend only)", async ({
    page,
  }) => {
    await page.goto("/en/learn/officer/contract-enforcement/");
    const quiz = page.locator("#module-quiz");
    await quiz.scrollIntoViewIfNeeded();
    const fieldsets = quiz.locator("fieldset");
    const count = await fieldsets.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const legend = fieldsets.nth(i).locator("legend");
      await expect(legend).toHaveCount(1);
      const promptText = (await legend.innerText()).trim();
      expect(promptText.length).toBeGreaterThan(10);
      // Prompt must not also appear as a sibling paragraph inside the fieldset.
      const siblingParas = fieldsets.nth(i).locator(":scope > p");
      await expect(siblingParas).toHaveCount(0);
    }
  });

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
