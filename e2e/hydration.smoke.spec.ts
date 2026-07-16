import { test, expect } from "@playwright/test";
import { USER_PREFERENCES_KEY } from "../src/lib/data/adapter";
import { attachPageErrorGuard } from "./helpers/console";

/**
 * Seeds display prefs before first paint so PreferencesInitScript mutates
 * <html> before React hydrates — the path that previously threw #418.
 * Kept in its own file so smoke.spec beforeEach (clear storage) cannot
 * wipe the seed.
 */
test.describe("Hydration with display prefs @smoke", () => {
  test("home hydrates cleanly with saved display prefs", async ({ page }) => {
    const guard = attachPageErrorGuard(page);

    await page.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          fontSize: "larger",
          highContrast: true,
          reducedMotion: false,
        }),
      );
    }, USER_PREFERENCES_KEY);

    await page.goto("/en/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-font-size",
      "larger",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-high-contrast",
      "",
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    guard.assertClean();
  });

  test("accessibility page hydrates cleanly with saved display prefs", async ({
    page,
  }) => {
    const guard = attachPageErrorGuard(page);

    await page.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          fontSize: "maximum",
          highContrast: false,
          reducedMotion: true,
        }),
      );
    }, USER_PREFERENCES_KEY);

    await page.goto("/en/accessibility/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-font-size",
      "maximum",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-reduced-motion",
      "",
    );
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    guard.assertClean();
  });
});
