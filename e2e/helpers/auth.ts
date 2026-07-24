import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Demo officer used by Hub smoke / mobile coverage. */
export const DEMO_OFFICER = {
  email: "president@local243.ca",
  password: "demo123",
  mfaCode: "000000",
} as const;

/** Hub home or MFA only — must not match `/app/login`. */
const HUB_POST_LOGIN = /\/en\/app(?:\/mfa)?\/?(?:\?.*)?$/;

/**
 * Sign in as a demo officer. Completes MFA only when the host has
 * AUTH_MFA_ENABLED and the session still needs a second factor.
 * Default hosts leave MFA off for usability (demo / local).
 *
 * Callers that run many Hub tests should prefer `test.describe.configure({ mode: "serial" })`
 * so parallel workers do not race Auth.js session/MFA JSON responses.
 */
export async function loginAsDemoOfficer(
  page: Page,
  creds: typeof DEMO_OFFICER = DEMO_OFFICER,
) {
  await page.goto("/en/app/login");
  await page.getByLabel(/Email|Courriel/i).fill(creds.email);
  await page.getByLabel(/Password|Mot de passe/i).fill(creds.password);
  await page.getByRole("button", { name: /Sign in|Connexion/i }).click();

  await expect(page).toHaveURL(HUB_POST_LOGIN, { timeout: 20_000 });

  await page.goto("/en/app/mfa");
  const codeInput = page.getByLabel(/Verification code|Code de vérification/i);
  const verified = page.getByText(/Identity verified|Identité vérifiée/i);
  const disabled = page.getByText(
    /MFA is not required|A2F n'est pas requise|not enabled|non activ/i,
  );

  await expect(codeInput.or(verified).or(disabled)).toBeVisible({
    timeout: 20_000,
  });

  if (await codeInput.isVisible()) {
    await codeInput.fill(creds.mfaCode);
    await page.getByRole("button", { name: /Verify|Vérifier/i }).click();
    await expect(page).toHaveURL(/\/en\/app\/?(?:\?.*)?$/, {
      timeout: 20_000,
    });
    await page.goto("/en/app/mfa");
    await expect(verified).toBeVisible({ timeout: 20_000 });
  }
}
