import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";

/**
 * Mobile menu layout-state matrix from the 2026-09-25 mobile nav audit
 * (prompt 13). Public hamburger is below 1280px; hub hamburger below 1536px.
 */
const PUBLIC_WIDTHS = [360, 390, 768] as const;

test.describe("Public mobile menu matrix @smoke @mobile", () => {
  for (const width of PUBLIC_WIDTHS) {
    test(`public menu open/close/Escape at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto("/en/create/");
      const toggle = page.getByTestId("mobile-nav-toggle");
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const drawer = page.getByTestId("mobile-nav-drawer");
      await expect(drawer).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(drawer).toHaveCount(0);

      await toggle.click();
      await expect(drawer).toBeVisible();
      await drawer.getByRole("link", { name: "Brand Kit", exact: true }).click();
      await expect(page).toHaveURL(/\/en\/create\/brand-kit\/?/);
      await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);
    });
  }
});

test.describe("Hub mobile menu matrix @smoke @mobile", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsDemoOfficer(page);
  });

  for (const width of PUBLIC_WIDTHS) {
    test(`hub menu open/close/Escape at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/en/app/");
      const toggle = page.getByTestId("hub-nav-toggle");
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const drawer = page.getByTestId("hub-nav-drawer");
      await expect(drawer).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(drawer).toHaveCount(0);
    });
  }

  test("hub hamburger shows a visible Menu label from sm widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/en/app/");
    const toggle = page.getByTestId("hub-nav-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText(/Menu|menu/i);
  });
});
