import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Demo officer used by Hub smoke / mobile coverage. */
export const DEMO_OFFICER = {
  email: "president.243@unionops.test",
  password: "demo123",
  mfaCode: "000000",
} as const;

/** Hub home, Portal home, or MFA — must not match `/app/login`. */
const POST_LOGIN = /\/en\/(?:app(?:\/mfa)?|portal)\/?(?:\?.*)?$/;

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

  await expect(page).toHaveURL(POST_LOGIN, { timeout: 20_000 });

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

/** Sign in via hub login. Does not clear MFA unless the account skips it. */
export async function hubLogin(
  page: Page,
  email: string,
  password = "demo123",
) {
  await page.goto("/en/app/login");
  await page.getByLabel(/Email|Courriel/i).fill(email);
  await page.getByLabel(/Password|Mot de passe/i).fill(password);
  await page.getByRole("button", { name: /Sign in|Connexion/i }).click();
  await expect(page).toHaveURL(POST_LOGIN, { timeout: 20_000 });
}

/** Complete MFA when landed on the verify page (dev code 000000). */
export async function completeMfaIfNeeded(page: Page) {
  if (!page.url().includes("/mfa")) return;
  await page
    .getByLabel(/Verification code|Code de vérification/i)
    .fill("000000");
  await page.getByRole("button", { name: /Verify|Vérifier/i }).click();
  await expect(page).toHaveURL(/\/en\/app\/?(?:\?.*)?$/, { timeout: 20_000 });
}

/** Rank-and-file Local Portal demo account — no MFA. */
export async function loginAsMember(page: Page) {
  await hubLogin(page, "member.243@unionops.test");
  await expect(page).toHaveURL(/\/en\/portal\/?(?:\?.*)?$/);
}

export async function loginAsPresident(page: Page) {
  await hubLogin(page, "president.243@unionops.test");
  await completeMfaIfNeeded(page);
}

export async function loginAsSteward(page: Page) {
  await hubLogin(page, "steward.243@unionops.test");
  await completeMfaIfNeeded(page);
}
