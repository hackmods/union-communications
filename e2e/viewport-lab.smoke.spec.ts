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
  });

  test("Hub and Portal deny framing; public home allows same-origin", async ({
    request,
  }) => {
    const hub = await request.get("/en/app/");
    expect(hub.headers()["x-frame-options"]?.toLowerCase()).toBe("deny");
    expect(hub.headers()["content-security-policy"] ?? "").toContain(
      "frame-ancestors 'none'",
    );

    const portal = await request.get("/en/portal/");
    expect(portal.headers()["x-frame-options"]?.toLowerCase()).toBe("deny");
    expect(portal.headers()["content-security-policy"] ?? "").toContain(
      "frame-ancestors 'none'",
    );

    const home = await request.get("/en/");
    expect(home.headers()["x-frame-options"]?.toLowerCase()).toBe(
      "sameorigin",
    );
    expect(home.headers()["content-security-policy"] ?? "").toContain(
      "frame-ancestors 'self'",
    );
  });
});
