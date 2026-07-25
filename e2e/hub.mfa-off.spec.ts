import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";

/**
 * Hub dashboard when AUTH_MFA_ENABLED is off (demo / sandbox default).
 * Modules must open — not show "MFA required".
 */
test.describe("Hub MFA-off dashboard @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsDemoOfficer(page);
  });

  test("dashboard modules unlock and MFA nav pill is hidden", async ({
    page,
  }) => {
    await page.goto("/en/app");
    await expect(
      page.getByRole("heading", { level: 1, name: /Dashboard|Tableau/i }),
    ).toBeVisible();

    // MFA chrome must not block demos when the host leaves MFA off.
    await expect(page.getByText(/MFA required|AMF requise/i)).toHaveCount(0);
    await expect(
      page.getByRole("navigation").getByText(/MFA verified|AMF vérifiée|MFA required|AMF requise/i),
    ).toHaveCount(0);

    // Confidential modules should offer Open module, not an MFA lock link.
    const grievances = page
      .locator("a")
      .filter({ hasText: /Open module|Ouvrir le module/i })
      .first();
    await expect(grievances).toBeVisible();

    await page.goto("/en/app/grievances");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Grievance Tracking|Suivi des griefs/i,
      }),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto("/en/app/bumping");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Stability Committee|Comité de stabilité/i,
      }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
