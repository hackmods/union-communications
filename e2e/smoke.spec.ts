import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { USER_PREFERENCES_KEY } from "../src/lib/data/adapter";

test.beforeEach(async ({ page }) => {
  await page.goto("/en/");
  await page.evaluate(() => localStorage.clear());
});

function seriousOrCriticalViolations(
  violations: { impact?: string | null }[],
) {
  return violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

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

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/en/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("font size preference persists across reload", async ({ page }) => {
    await page.goto("/en/accessibility/");
    await page.getByRole("radio", { name: "Larger (20px)" }).check();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-font-size", "larger");
    const fontSize = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(20);
  });

  test("high contrast preference applies data attribute", async ({ page }) => {
    await page.goto("/en/accessibility/");
    await page.getByRole("checkbox", { name: "High contrast" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-high-contrast", "");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-high-contrast", "");
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      USER_PREFERENCES_KEY,
    );
    expect(stored).toContain('"highContrast":true');
  });

  test("guide page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/guide/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("home page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("accessibility page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/accessibility/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("brand kit page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/brand-kit/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
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
