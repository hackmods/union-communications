import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";
import { expectNoSeriousA11yViolations } from "./helpers/axe";

/**
 * Hybrid settings — preference toggle / unlock UI must not crash; axe-clean.
 */
test.describe("Hybrid page @smoke", () => {
  test("hybrid settings load and are axe-clean", async ({ page }) => {
    await loginAsDemoOfficer(page);
    await page.goto("/en/app/hybrid");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Hybrid data mode|Mode de donn/i,
      }),
    ).toBeVisible({ timeout: 20_000 });

    // RadioGroup may render twice in some layouts — only assert presence.
    await expect(page.locator("#dataMode-central").first()).toBeVisible();
    await expect(page.locator("#dataMode-local").first()).toBeVisible();

    await expectNoSeriousA11yViolations(page);
  });
});
