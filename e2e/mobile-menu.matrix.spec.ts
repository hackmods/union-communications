import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";
import { assertNoHorizontalOverflow } from "./helpers/layout";

/**
 * Mobile menu layout-state matrix from the 2026-09-25 mobile nav audit
 * (prompt 13). Public hamburger is below 1280px; hub hamburger below 1536px.
 * Large-text cases cover Accessibility one-tap access (2026-09-26).
 */
const PUBLIC_WIDTHS = [360, 390, 768] as const;
const LARGE_TEXT_WIDTHS = [320, 360] as const;

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

  for (const width of LARGE_TEXT_WIDTHS) {
    test(`public menu + Accessibility at ${width}px with maximum text`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 812 });
      await page.goto("/en/create/");
      await page.evaluate(() => {
        document.documentElement.dataset.fontSize = "maximum";
        document.documentElement.style.setProperty("--text-scale", "1.5");
      });

      await assertNoHorizontalOverflow(page);

      const accessibility = page.getByTestId("display-settings-toggle");
      await expect(accessibility).toBeVisible();
      await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);

      await accessibility.click();
      const panel = page.getByTestId("display-settings-panel");
      await expect(panel).toBeVisible();
      const radios = panel.getByRole("radio");
      await expect(radios.first()).toBeVisible();
      const radioBox = await radios.first().boundingBox();
      expect(radioBox).toBeTruthy();
      if (radioBox) {
        expect(radioBox.x).toBeGreaterThanOrEqual(0);
        expect(radioBox.x + radioBox.width).toBeLessThanOrEqual(width + 1);
      }

      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);

      const toggle = page.getByTestId("mobile-nav-toggle");
      await expect(toggle).toContainText(/Menu/i);
      await toggle.click();
      await expect(page.getByTestId("mobile-nav-drawer")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await page.keyboard.press("Escape");
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
