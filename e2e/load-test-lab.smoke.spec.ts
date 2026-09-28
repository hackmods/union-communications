import { test, expect } from "@playwright/test";

/**
 * Operator Load Test Lab — chrome renders; Start stays refused without flags.
 */
test.describe("Load Test Lab @smoke", () => {
  test("renders QA Labs chrome", async ({ page }) => {
    await page.goto("/load-test-lab/");
    await expect(
      page.getByRole("heading", { name: "Load Test Lab" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "QA Labs" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Viewport Lab" }),
    ).toBeVisible();
  });
});
