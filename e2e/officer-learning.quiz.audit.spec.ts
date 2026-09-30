import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { OFFICER_LEARNING_MODULES } from "../src/lib/officer-learning/modules";
import { parseOfficerLearningModule } from "../src/lib/officer-learning/parse-module";
import type { QuizQuestion } from "../src/lib/officer-learning/types";

const PROGRESS_KEY = "unionops-officer-learning-progress";

function loadQuiz(moduleId: string): QuizQuestion[] {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), "src/content/officer-learning", `${moduleId}.md`),
    "utf8",
  );
  return parseOfficerLearningModule(moduleId, markdown).quiz;
}

async function answerAndSubmit(page: Page, questions: QuizQuestion[]) {
  const quiz = page.locator("#module-quiz");
  const fieldsets = quiz.locator("fieldset");
  await expect(fieldsets).toHaveCount(questions.length);

  for (let index = 0; index < questions.length; index += 1) {
    await fieldsets.nth(index).locator(`input[value="${questions[index].correctOptionId}"]`).check();
  }
  await quiz.getByRole("button", { name: /Submit|Soumettre/i }).click();
  await expect(quiz.getByText(new RegExp(`${questions.length}\\s*/\\s*${questions.length}`))).toBeVisible();
  for (let index = 0; index < questions.length; index += 1) {
    await expect(fieldsets.nth(index).locator("[data-quiz-explanation]")).toHaveAttribute("aria-hidden", "false");
  }
}

test.describe("Officer Learning quiz audit remediation @smoke", () => {
  test("all 17 authored quizzes render, grade every answer position, and reveal feedback", async ({ page }) => {
    test.setTimeout(240_000);

    for (const module of OFFICER_LEARNING_MODULES) {
      const questions = loadQuiz(module.id);
      expect(questions).toHaveLength(6);
      await page.goto(`/en/guide/officer-learning/${module.slug}/`);
      const quiz = page.locator("#module-quiz");
      await expect(quiz.locator("p").first()).toHaveText("Self-test");
      const fieldsets = quiz.locator("fieldset");
      await expect(fieldsets).toHaveCount(questions.length);

      for (let index = 0; index < questions.length; index += 1) {
        await expect(fieldsets.nth(index).locator("input[type=radio]")).toHaveCount(4);
        await expect(fieldsets.nth(index).locator("[data-quiz-explanation]")).toHaveAttribute("aria-hidden", "true");
      }

      await answerAndSubmit(page, questions);
    }
  });

  test("wrong answers show trap-aware feedback and saved completion can be retested", async ({ page }) => {
    const module = OFFICER_LEARNING_MODULES.find((item) => item.id === "module-1");
    if (!module) throw new Error("Module 1 metadata is missing");
    const questions = loadQuiz(module.id);
    await page.goto(`/en/guide/officer-learning/${module.slug}/`);
    await page.evaluate((key) => localStorage.removeItem(key), PROGRESS_KEY);
    await page.reload();

    await answerAndSubmit(page, questions);
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), PROGRESS_KEY);
    expect(stored[module.id]).toMatchObject({ quizPassed: true, status: "completed" });

    await page.reload();
    const quiz = page.locator("#module-quiz");
    await expect(quiz.getByText(/You already passed this self-test/i)).toBeVisible();
    await quiz.getByRole("button", { name: /Practice again/i }).click();

    const fieldsets = quiz.locator("fieldset");
    await expect(quiz.locator('input[type="radio"]:checked')).toHaveCount(0);
    const wrongId = questions[0].correctOptionId === "A" ? "B" : "A";
    await fieldsets.nth(0).locator(`input[value="${wrongId}"]`).check();
    for (let index = 1; index < questions.length; index += 1) {
      await fieldsets.nth(index).locator(`input[value="${questions[index].correctOptionId}"]`).check();
    }
    await quiz.getByRole("button", { name: /Submit/i }).click();
    await expect(quiz.getByText(/5\s*\/\s*6/)).toBeVisible();
    await expect(fieldsets.nth(0).locator("[data-quiz-explanation]")).toHaveAttribute("aria-hidden", "false");
    await quiz.getByRole("button", { name: /Try again/i }).click();
    await expect(quiz.locator('input[type="radio"]:checked')).toHaveCount(0);
    await expect(quiz.getByRole("button", { name: /Submit/i })).toBeDisabled();
  });

  test("the DFR volunteer misconception receives the intended correction", async ({ page }) => {
    const module = OFFICER_LEARNING_MODULES.find((item) => item.id === "module-15");
    if (!module) throw new Error("Module 15 metadata is missing");
    const questions = loadQuiz(module.id);
    const questionIndex = 2;
    expect(questions[questionIndex].options.find((option) => option.id === "B")?.label).toMatch(/volunteers cannot owe/i);

    await page.goto(`/en/guide/officer-learning/${module.slug}/`);
    const quiz = page.locator("#module-quiz");
    const fieldsets = quiz.locator("fieldset");
    for (let index = 0; index < questions.length; index += 1) {
      const optionId = index === questionIndex ? "B" : questions[index].correctOptionId;
      await fieldsets.nth(index).locator(`input[value="${optionId}"]`).check();
    }
    await quiz.getByRole("button", { name: /Submit/i }).click();
    await expect(quiz.getByText(/5\s*\/\s*6/)).toBeVisible();
    await expect(fieldsets.nth(questionIndex).locator("[data-quiz-explanation]")).toContainText(/volunteer status does not erase the duty/i);
  });

  test("Module 16 Q5 renders its authored D option without the captured artifact", async ({ page }) => {
    const module = OFFICER_LEARNING_MODULES.find((item) => item.id === "module-16");
    if (!module) throw new Error("Module 16 metadata is missing");
    const questions = loadQuiz(module.id);
    await page.goto(`/en/guide/officer-learning/${module.slug}/`);
    const q5 = page.locator("#module-quiz fieldset").nth(4);
    const expectedD = "Withdraw — silent CAs mean unlimited employer discretion always wins.";
    expect(questions[4].options.find((option) => option.id === "D")?.label).toBe(expectedD);
    await expect(q5.locator('input[value="D"]')).toBeVisible();
    await expect(q5).toContainText(expectedD);
    await expect(q5).not.toContainText(/according to the audit|capture artifact|annotation/i);
  });
});
