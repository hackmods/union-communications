import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";

/**
 * MFA setup surface is reachable after demo login.
 * Default hosts leave AUTH_MFA_ENABLED off — page still loads (disabled or setup UI).
 */
test.describe("MFA setup path @smoke", () => {
  test("mfa pages are reachable after login", async ({ page }) => {
    await loginAsDemoOfficer(page);
    await page.goto("/en/app/mfa");
    await expect(
      page.getByText(
        /Identity verified|Identité vérifiée|MFA is not required|A2F n'est pas requise/i,
      ),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto("/en/app/mfa/setup");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Set up an authenticator|Configurer une appli/i,
      }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
