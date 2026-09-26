import { test, expect } from "@playwright/test";

/**
 * Operator Viewport Lab — Muse/agent device frame.
 * Complements Playwright setViewportSize; does not replace it.
 */
test.describe("Viewport Lab @smoke", () => {
  test("loads, exposes API, and Mobile preset resizes iframe", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/viewport-lab/?w=1280&h=800&path=/en/&locale=en");

    await expect(
      page.getByRole("heading", { name: "Viewport Lab" }),
    ).toBeVisible();

    const version = await page.evaluate(
      () => window.__unionopsViewportLab?.version,
    );
    expect(version).toBe(1);

    await page.getByTestId("viewport-preset-mobile").click();
    await page.waitForTimeout(350);

    const logical = await page.evaluate(() => {
      const frame = document.querySelector(
        '[data-testid="viewport-frame-a"]',
      ) as HTMLIFrameElement | null;
      return frame ? { w: frame.clientWidth, h: frame.clientHeight } : null;
    });
    expect(logical?.w).toBe(375);
    expect(logical?.h).toBe(812);

    const preset = await page.evaluate(
      () => window.__unionopsViewportLab?.getViewport().preset,
    );
    expect(preset).toBe("mobile");

    await page
      .frameLocator('[data-testid="viewport-frame-a"]')
      .locator("body")
      .waitFor({ state: "visible" });

    const overflow = await page.evaluate(() =>
      window.__unionopsViewportLab?.checkOverflow(),
    );
    expect(overflow && !("error" in overflow)).toBe(true);
    if (overflow && "horizontalPx" in overflow) {
      expect(overflow.horizontalPx).toBeGreaterThanOrEqual(0);
    }

    const axe = await page.evaluate(async () =>
      window.__unionopsViewportLab?.runAxe({ colorContrast: false }),
    );
    expect(axe?.ok).toBe(true);
    if (axe?.ok) {
      expect(Array.isArray(axe.violations)).toBe(true);
    }
  });
});
