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
    // The help panel repeats "Can't scan" and is visible before QR generation.
    // Scope the click to the disclosure that actually contains the manual key.
    const manualSetup = page.locator("details").filter({ has: page.locator("p.font-mono") });
    await manualSetup.locator("summary").click();
    const secretField = manualSetup.locator("p.font-mono");
    await expect(secretField).toBeVisible();
    await expect(secretField).toHaveText(/^[A-Z2-7]+$/);
    const secret = (await secretField.innerText()).trim();

    expect(/^[A-Z2-7]+$/.test(secret), "manual key must be readable before generating a code").toBe(true);
    const code = generateTotp(secret);
    const codeField = page.getByLabel(/6-digit code|code à 6 chiffres/i);
    const confirmation = page.waitForResponse((response) =>
      response.url().includes("/api/mfa/enroll/confirm") &&
      response.request().method() === "POST" &&
      response.status() !== 308 && response.status() !== 307,
    );
    await codeField.fill(code);
    const confirmationResponse = await confirmation;
    expect(confirmationResponse.request().postDataJSON().code === code,
      "auto-submit must send the completed code").toBe(true);
    const outcome = await confirmationResponse.json();
    expect(confirmationResponse.status(), `confirmation outcome: ${outcome.code ?? "success"}`).toBe(200);
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
