import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/en/");
  await page.evaluate(() => localStorage.clear());
});

test.describe("Smoke tests @smoke", () => {
  test("home page renders in English", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("home page renders in French", async ({ page }) => {
    await page.goto("/fr/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/en/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "The Blueprint" }).click();
    await expect(page).toHaveURL(/\/en\/guide/);
  });

  test("guide page has no critical a11y violations", async ({ page }) => {
    await page.goto("/en/guide/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === "critical")).toEqual([]);
  });

  test("logo builder page renders", async ({ page }) => {
    await page.goto("/en/tools/logo-builder/");
    await expect(page.getByRole("heading", { name: "Local Logo Builder" })).toBeVisible();
  });

  test("captions page has copy buttons", async ({ page }) => {
    await page.goto("/en/captions/");
    await expect(page.getByRole("button", { name: "Copy" }).first()).toBeVisible();
  });

  test("brand kit page renders", async ({ page }) => {
    await page.goto("/en/brand-kit/");
    await expect(page.getByRole("heading", { name: "Brand Kit Manager" })).toBeVisible();
  });

  test("privacy page renders", async ({ page }) => {
    await page.goto("/en/privacy/");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });
});
