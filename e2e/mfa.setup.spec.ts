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
    // Title + panel share the same phrase — scope to the page h1.
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Identity verified|Identité vérifiée|Multi-factor authentication is not required|authentification multifactorielle n.est pas requise|Verification is not required|vérification n.est pas requise/i,
      }),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto("/en/app/mfa/setup");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Set up an authenticator|Configurer une appli|Replace your authenticator|Remplacer votre appli|Multi-factor authentication is not required|authentification multifactorielle n.est pas requise/i,
      }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
