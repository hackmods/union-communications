import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolationsWithContrast } from "./helpers/axe";
import { seedCanvasFonts } from "./helpers/canvas-fonts";
import { expectPresetSelected } from "./helpers/canvas-layout";
import { assertNoHorizontalOverflow } from "./helpers/layout";

test.describe("Local Portal pocket share @smoke", () => {
  test("EN phone pitch has QR, both CTAs, and no overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/en/local-portal/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your local, on the phone",
    );
    await expect(
      page.getByRole("link", { name: "Bring your local", exact: true }),
    ).toHaveAttribute("href", "/en/join/");
    await expect(
      page.getByRole("link", { name: "Request member access", exact: true }),
    ).toHaveAttribute("href", "/en/request-access/");
    await expect(page.getByTestId("local-portal-qr")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "Copy link" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolationsWithContrast(page);
  });

  test("FR phone pitch keeps locked names and both CTAs", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/fr/local-portal/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Votre section, sur le téléphone",
    );
    await expect(page.getByText("Ensemble", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Cercles et Salle")).toBeVisible();
    await expect(page.getByText("Relais", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Amenez votre section", exact: true }),
    ).toHaveAttribute("href", "/fr/join/");
    await expect(
      page.getByRole("link", { name: /Demander l.accès membre/ }),
    ).toHaveAttribute("href", "/fr/request-access/");
    await expect(page.getByTestId("local-portal-qr")).toBeVisible({
      timeout: 15_000,
    });
    await assertNoHorizontalOverflow(page);
  });

  test("QR Card localPortal preset points at the pocket page", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/create/qr-card/?preset=localPortal");
    await expect(
      page.getByRole("heading", { name: "QR Link Card Maker" }),
    ).toBeVisible();
    await expectPresetSelected(page, "localPortal");
    await expect(page.getByLabel(/Link or text to encode/i)).toHaveValue(
      /\/en\/local-portal\/?$/,
    );
  });
});
