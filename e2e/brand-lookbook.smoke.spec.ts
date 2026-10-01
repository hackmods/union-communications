import { test, expect } from "@playwright/test";
import { loginAsPlatformAdmin } from "./helpers/auth";
import { expectNoSeriousA11yViolations } from "./helpers/axe";

test.describe("Brand Lookbook showcase @smoke", () => {
  test("loads the public lookbook and stays axe-clean", async ({ page }) => {
    await page.goto("/en/brand-kit/showcase/");
    const lookbook = page.getByTestId("brand-lookbook");
    await expect(lookbook).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Brand lookbook|See your brand/i }).first(),
    ).toBeVisible();
    const nav = page.getByTestId("brand-lookbook-nav");
    await expect(nav.getByRole("link", { name: /Foundations/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Actions/i })).toBeVisible();
    await expect(page.getByTestId("brand-lookbook-hub-strip")).toBeVisible();
    await expect(
      lookbook.getByRole("button", { name: /Primary/i }).first(),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("French showcase heading loads", async ({ page }) => {
    await page.goto("/fr/brand-kit/showcase/");
    await expect(page.getByTestId("brand-lookbook")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Carnet de marque|Voir votre marque/i }).first(),
    ).toBeVisible();
  });
});

test.describe("Brand Lookbook on Site Admin @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("platform admin sees compact lookbook when editing a theme", async ({
    page,
  }) => {
    await loginAsPlatformAdmin(page);
    await page.goto("/en/app/site-admin/brand-styles");
    await expect(
      page.getByRole("heading", { name: /Brand styles|Styles de marque/i }),
    ).toBeVisible({ timeout: 20_000 });

    const editButton = page
      .getByRole("button", { name: /Edit style|Modifier le style/i })
      .first();
    await expect(editButton).toBeVisible({ timeout: 20_000 });
    await editButton.click();

    const themeToggle = page.getByRole("checkbox", {
      name: /Override colours and fonts|Remplacer couleurs/i,
    });
    if (await themeToggle.isVisible().catch(() => false)) {
      if (!(await themeToggle.isChecked())) {
        await themeToggle.check();
      }
    }

    await expect(page.getByTestId("brand-lookbook")).toBeVisible({
      timeout: 15_000,
    });
    await expectNoSeriousA11yViolations(page);
  });
});
