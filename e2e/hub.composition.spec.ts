import { test, expect } from "@playwright/test";
import { loginAsMember, loginAsPresident } from "./helpers/auth";
import { assertDesktopComposition, assertNoHorizontalOverflow } from "./helpers/layout";

/**
 * VL-HUB-2 / VL-HUB-4 — scripted 1280 composition + 200% zoom approximation.
 * Human screen-reader sign-off remains in the fit-gap / session-knowledge note.
 */
test.describe("Hub / Portal desktop composition @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard attention and next-steps compose at 1280", async ({ page }) => {
    await loginAsPresident(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/app");
    const attention = page.getByRole("heading", { name: "What needs my attention?" });
    const attentionBody = page.getByText(
      "Your assigned work in this local. Other casework remains in the navigation.",
    );
    await assertDesktopComposition(page, {
      heading: attention,
      measure: attentionBody,
      maxHeadingY: 480,
      maxMeasurePx: 640,
    });
    await expect(page.getByRole("heading", { name: "What can I do next?" })).toBeVisible();
    const widgets = page.getByTestId("hub-attention-widgets");
    await expect(widgets).toBeVisible();
    const box = await widgets.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y).toBeLessThan(900);
  });

  test("grievance detail composes at 1280", async ({ page }) => {
    await loginAsPresident(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/app/grievances");
    const detailLink = page
      .locator('a[href*="/app/grievances/"]:not([href*="/new"])')
      .first();
    await expect(detailLink).toBeVisible({ timeout: 20_000 });
    await Promise.all([
      page.waitForURL(/\/en\/app\/grievances\/[^/]+/, { timeout: 20_000 }),
      detailLink.click(),
    ]);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await assertDesktopComposition(page, {
      heading: h1,
      maxHeadingY: 420,
      maxMeasurePx: 900,
    });
  });

  test("Portal Hall circle composes at 1280", async ({ page }) => {
    await loginAsMember(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/portal/circles/circle-hall-7");
    const h1 = page.getByRole("heading", { name: /Local 777 Hall|Hall/i }).first();
    await expect(h1).toBeVisible({ timeout: 20_000 });
    await assertDesktopComposition(page, {
      heading: h1,
      maxHeadingY: 420,
      maxMeasurePx: 960,
    });
  });

  test("dashboard remains usable at 200% browser zoom approximation", async ({ page }) => {
    await loginAsPresident(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/app");
    await page.evaluate(() => {
      document.documentElement.style.zoom = "200%";
    });
    await expect(page.getByRole("heading", { name: "What needs my attention?" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.getByTestId("hub-nav-toggle").click();
    await expect(page.getByTestId("hub-nav-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
