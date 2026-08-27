import { test, expect } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers/axe";
import { loginAsDemoOfficer } from "./helpers/auth";

/**
 * Officer Learning Center — public dashboard/modules + Hub report.
 * Tagged @smoke for launch gate.
 */
test.describe("Officer Learning @smoke", () => {
  test("dashboard shows module cards and is axe-clean", async ({ page }) => {
    await page.goto("/en/guide/officer-learning/");
    await expect(
      page.getByRole("heading", { name: "Officer Learning Center" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Contract Enforcement/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("module page has sticky jump to quiz and axe-clean", async ({ page }) => {
    await page.goto("/en/guide/officer-learning/contract-enforcement/");
    await expect(
      page.getByRole("heading", { name: "Contract Enforcement" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Jump to Quiz/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("failed quiz Try again re-enables inputs", async ({ page }) => {
    await page.goto("/en/guide/officer-learning/contract-enforcement/");
    await page.getByRole("link", { name: /Jump to Quiz/i }).click();

    const quiz = page.locator("#module-quiz");
    await expect(quiz).toBeVisible();

    const firstOptions = quiz.locator('input[type="radio"][value="A"]');
    const aCount = await firstOptions.count();
    expect(aCount).toBeGreaterThan(0);
    for (let i = 0; i < aCount; i++) {
      await firstOptions.nth(i).check({ force: true });
    }

    await quiz.getByRole("button", { name: /Submit answers/i }).click();
    await expect(quiz.getByRole("button", { name: /Try again/i })).toBeVisible({
      timeout: 10_000,
    });

    await quiz.getByRole("button", { name: /Try again/i }).click();
    await expect(quiz.getByRole("radio").first()).toBeEnabled();
  });

  test("Hub officer learning report loads for demo president", async ({
    page,
  }) => {
    await loginAsDemoOfficer(page);
    await page.goto("/en/app/officer-learning/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 20_000,
    });
  });
});
