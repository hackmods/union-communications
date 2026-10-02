import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { clearAuthSession, hubLogin } from "./helpers/auth";

// Explicit regeneration only, against the local synthetic demo server.
// Capture real rendered sections without substituting data or changing the DOM.
test("capture bilingual synthetic hosted product examples", async ({ page, baseURL }) => {
  test.skip(process.env.UNIONOPS_CAPTURE_PRODUCT_PREVIEWS !== "true");
  expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  test.setTimeout(90_000);
  const destination = resolve("public/product-previews");
  await mkdir(destination, { recursive: true });
  await page.setViewportSize({ width: 900, height: 1000 });
  await hubLogin(page, "president.7@unionops.test");
  for (const locale of ["en", "fr"]) {
    const loaded = Promise.all([
      page.waitForResponse((r) => /\/api\/tasks\/?\?mine=1/.test(r.url()) && r.ok()),
      page.waitForResponse((r) => /\/api\/checkins\/mine\/?\?/.test(r.url()) && r.ok()),
    ]);
    await page.goto(`/${locale}/app/`);
    await loaded;
    const section = page.locator('section[aria-labelledby="hub-attention-heading"]');
    await expect(section).toBeVisible();
    await expect(section).not.toContainText(/Loading|Chargement/);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [900, 480]) {
      await page.setViewportSize({ width, height: 1000 });
      await section.screenshot({ path: resolve(destination, `hub-${locale}${width === 480 ? "-phone" : ""}.png`), style: "nextjs-portal { visibility: hidden !important; }" });
    }
    await page.setViewportSize({ width: 900, height: 1000 });
  }
  await clearAuthSession(page);
  await hubLogin(page, "member.7@unionops.test");
  for (const locale of ["en", "fr"]) {
    await page.goto(`/${locale}/portal/`);
    const section = page.locator('section[aria-labelledby="portal-circles-heading"]');
    await expect(section.getByRole("link").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [900, 480]) {
      await page.setViewportSize({ width, height: 1000 });
      await section.screenshot({ path: resolve(destination, `portal-${locale}${width === 480 ? "-phone" : ""}.png`), style: "nextjs-portal { visibility: hidden !important; }" });
    }
    await page.setViewportSize({ width: 900, height: 1000 });
  }
});
