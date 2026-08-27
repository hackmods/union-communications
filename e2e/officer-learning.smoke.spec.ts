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
      page.getByRole("link", { name: "Contract Enforcement", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Module 1: Contract Enforcement", exact: true }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("steward playbooks hub is axe-clean with training path", async ({ page }) => {
    await page.goto("/en/guide/steward-playbooks/");
    await expect(
      page.getByRole("heading", { name: "Steward playbooks", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator("#trainingPath")
        .getByRole("link", { name: "Officer Learning Center", exact: true }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("DFR playbook has H1 and is axe-clean", async ({ page }) => {
    await page.goto("/en/guide/dfr/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Officer Learning module")).toBeVisible();
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
    await expect(
      page.getByRole("heading", { name: "Worked scenario", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Worked file timeline", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("D0")).toBeVisible();
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
