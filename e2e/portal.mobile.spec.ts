import { test, expect } from "@playwright/test";
import { loginAsMember } from "./helpers/auth";
import { assertNoHorizontalOverflow } from "./helpers/layout";

/**
 * Local Portal @mobile — Together, Hall, Bulletin (UI-010).
 */
test.describe("Portal mobile @smoke @mobile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMember(page);
  });

  test("Together dashboard has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/portal");
    await expect(page.getByRole("heading", { name: "Together" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("Hall circle workspace has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/portal");
    await page.getByRole("link", { name: "Local 243 Hall" }).click();
    await expect(
      page.getByRole("heading", { name: "Local 243 Hall" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("Bulletin writer tab has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/portal/circles/circle-hall-243");
    await page.getByRole("tab", { name: "Bulletin" }).click();
    await expect(page.getByPlaceholder("Bulletin title")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
