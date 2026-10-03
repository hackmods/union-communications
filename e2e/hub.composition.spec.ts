import { test, expect } from "@playwright/test";
import { loginAsMember, loginAsPresident } from "./helpers/auth";
import { assertDesktopComposition, assertNoHorizontalOverflow } from "./helpers/layout";

/**
 * VL-HUB-2 / VL-HUB-4 — scripted 1280 composition + 200% zoom approximation.
 * Human screen-reader sign-off remains in the fit-gap / session-knowledge note.
 */
test.describe("Hub / Portal desktop composition @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard attention and launchpad compose at 1280", async ({ page }) => {
    await loginAsPresident(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/app");
    const attention = page.getByRole("heading", { name: "What needs my attention?" });
    const attentionBody = page.getByText(
      "Your assigned work in this local. Other casework remains in Your tools.",
    );
    await assertDesktopComposition(page, {
      heading: attention,
      measure: attentionBody,
      maxHeadingY: 560,
      maxMeasurePx: 640,
    });
    await expect(page.getByRole("heading", { name: "Your tools" })).toBeVisible();
    const widgets = page.getByTestId("hub-attention-widgets");
    await expect(widgets).toBeVisible();
    const box = await widgets.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y).toBeLessThan(900);
  });

  test("grievance detail composes at 1280", async ({ page }) => {
    await loginAsPresident(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    // Seed memory grievance — avoid list-row click races (New CTA is a
    // button-in-link; row Card clicks have flaked under shard load).
    await page.goto("/en/app/grievances/grev-001");
    await expect(page).toHaveURL(/\/en\/app\/grievances\/grev-001\/?$/, {
      timeout: 20_000,
    });
    // Seed grev-001 title is the member pseudonym (no fileNumber).
    const h1 = page.getByRole("heading", { level: 1, name: /Member A/i });
    await expect(h1).toBeVisible({ timeout: 20_000 });
    await assertDesktopComposition(page, {
      heading: h1,
      // Hub shell + back link sit above the case title; keep first-viewport,
      // but allow a bit more than the bare 420 used for denser Hub home.
      maxHeadingY: 520,
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

  test("dashboard remains usable at the effective 200% zoom viewport", async ({ page }) => {
    await loginAsPresident(page);
    await page.goto("/en/app");
    // A real 200% desktop zoom halves the layout viewport. CSS `zoom` does not
    // consistently change media-query evaluation, so use its effective size.
    await page.setViewportSize({ width: 640, height: 450 });
    await expect(page.getByRole("heading", { name: "What needs my attention?" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.getByTestId("hub-nav-toggle").click();
    await expect(page.getByTestId("hub-nav-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
