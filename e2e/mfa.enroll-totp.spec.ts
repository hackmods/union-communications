import { test, expect } from "@playwright/test";
import { hubLogin } from "./helpers/auth";
import { generateTotp } from "../src/lib/auth/totp";

/**
 * First-time TOTP enrollment when the host requires authenticator mode.
 * Default demo/sandbox hosts leave AUTH_MFA_ENABLED off — this spec skips.
 */
test.describe("MFA TOTP enrollment", () => {
  test.skip(
    process.env.AUTH_MFA_ENABLED !== "true" || process.env.AUTH_MFA_MODE !== "totp",
    "Run against a host with AUTH_MFA_ENABLED=true and AUTH_MFA_MODE=totp",
  );

  test("solo steward enrolls with one authenticator code", async ({ page }) => {
    await hubLogin(page, "solo@unionops.test");
    await page.goto("/en/app/mfa/setup");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Set up an authenticator|Configurer une appli/i,
      }),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /Generate setup code|Générer/i }).click();
    await page.getByText(/Can't scan the QR code|Impossible de scanner/i).click();
    const secretField = page.locator("details p.font-mono");
    await expect(secretField).toHaveText(/^[A-Z2-7]+$/);
    const secret = (await secretField.innerText()).trim();

    // Generate against the app's HTTP clock. Local browser runners and a
    // containerized app can have enough clock skew to exceed the TOTP window.
    const clockResponse = await page.request.get("/api/health");
    const serverDate = clockResponse.headers()["date"];
    expect(serverDate, "app response should include its server clock").toBeTruthy();
    const code = generateTotp(secret, Date.parse(serverDate!));
    const codeField = page.getByLabel(/6-digit code|code à 6 chiffres/i);
    await codeField.fill(code);
    // Filling six digits must submit the exact completed value on its own.
    // A manual Confirm click here would hide a broken auto-submit path.
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Authenticator app enrolled|Appli d.authentification activée/i,
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("list")).toBeVisible();
    await page.getByLabel(/I have saved these codes|J.ai enregistré ces codes/i).check();
    await page.getByRole("button", { name: /Continue|Continuer/i }).click();
    await expect(page).toHaveURL(/\/en\/app\/?(?:\?.*)?$/, { timeout: 20_000 });
  });
});
