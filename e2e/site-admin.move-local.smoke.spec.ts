import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";
import { expectNoSeriousA11yViolations } from "./helpers/axe";

/**
 * Move Local commit MFA path — structure/a11y smoke when a platform admin
 * session is available. Demo officer cannot open Site Admin; set
 * E2E_SITE_ADMIN_EMAIL + E2E_SITE_ADMIN_PASSWORD to exercise the live panel.
 *
 * Component-level MFA/preview coverage lives in MoveLocalPanel.test.tsx.
 */
test.describe("Site Admin Move Local @smoke", () => {
  test.describe.configure({ mode: "serial" });

  const adminEmail = process.env.E2E_SITE_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.E2E_SITE_ADMIN_PASSWORD?.trim() ?? "demo123";

  test("organization locals surface stays accessible for site admin", async ({
    page,
  }) => {
    test.skip(
      !adminEmail,
      "Set E2E_SITE_ADMIN_EMAIL to run live Site Admin Move Local smoke",
    );

    await loginAsDemoOfficer(page, {
      email: adminEmail!,
      password: adminPassword,
      mfaCode: "000000",
    });

    await page.goto("/en/app/site-admin/organization");
    await expect(
      page.getByRole("heading", {
        name: /Organization structure|Structure organisationnelle/i,
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expectNoSeriousA11yViolations(page);

    const openStructure = page
      .getByRole("link", { name: /Open structure|Ouvrir la structure/i })
      .first();
    await openStructure.click();
    await expect(
      page.getByRole("heading", {
        name: /Organization structure —|Structure organisationnelle/i,
      }),
    ).toBeVisible({ timeout: 20_000 });

    const moveButton = page.getByRole("button", { name: /^Move$|^Déplacer$/i }).first();
    await expect(moveButton).toBeVisible();
    await moveButton.click();
    await expect(page.getByTestId("local-move-panel")).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await page.route("**/api/site-admin/locals/*/move/preview", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          preview: {
            fromUnionId: "union-a",
            toUnionId: "union-b",
            fromUnionName: "Source",
            toUnionName: "Destination",
            localNumber: "7",
            effectiveLocalNumber: "7",
            fromIsDemo: false,
            toIsDemo: false,
            fromMembershipPolicy: "multi_local",
            toMembershipPolicy: "multi_local",
            counts: {
              usersPrimary: 0,
              memberships: 0,
              invites: 0,
              bargainingUnits: 0,
              caseworkRows: 0,
              portalCircles: 0,
              tablesWithRows: 0,
            },
            blocks: [],
            warnings: [],
            conflictingUserIds: [],
            canMove: true,
          },
        }),
      });
    });

    await page.route("**/api/site-admin/locals/*/move", async (route) => {
      if (route.request().url().includes("/preview")) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 428,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Fresh MFA is required",
          code: "mfa_step_up_required",
        }),
      });
    });

    const destination = page.getByLabel(/Destination union|Syndicat de destination/i);
    if (await destination.isEnabled()) {
      const options = destination.locator("option");
      const count = await options.count();
      if (count > 1) {
        await destination.selectOption({ index: 1 });
        await page.getByRole("button", { name: /Preview move|Aperçu du déplacement/i }).click();
        await expect(page.getByTestId("local-move-preview")).toBeVisible({
          timeout: 10_000,
        });
        await page
          .getByLabel(/Type the current local number|Saisissez le numéro/i)
          .fill("7");
        await page
          .getByRole("button", { name: /Move local|Déplacer la section locale/i })
          .click();
        await expect(
          page.getByLabel(/authenticator code|code.*authenticator|Your authenticator/i),
        ).toBeVisible({ timeout: 10_000 });
        await expectNoSeriousA11yViolations(page);
      }
    }
  });
});
