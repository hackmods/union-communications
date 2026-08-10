import { test, expect } from "@playwright/test";
import { assertSeoBasics } from "./helpers/seo";

test.describe("SEO smoke @smoke", () => {
  test("home EN has title, OG, canonical, and hreflang", async ({ page }) => {
    await page.goto("/en/");
    await assertSeoBasics(page, {
      titleIncludes: /UnionOps/,
      canonicalPath: "/en/",
      hreflang: true,
      ogUrlIncludes: "/en/",
    });
  });

  test("home FR has localized title and hreflang", async ({ page }) => {
    await page.goto("/fr/");
    await assertSeoBasics(page, {
      titleIncludes: /UnionOps/,
      descriptionIncludes: /vie privée|Outils|section/i,
      canonicalPath: "/fr/",
      hreflang: true,
      ogUrlIncludes: "/fr/",
    });
  });

  test("graphic-maker EN and FR have locale-correct OG urls", async ({
    page,
  }) => {
    await page.goto("/en/tools/graphic-maker/");
    await assertSeoBasics(page, {
      titleIncludes: /Graphic Maker|UnionOps/i,
      canonicalPath: "/en/tools/graphic-maker/",
      ogUrlIncludes: "/en/tools/graphic-maker/",
      hreflang: true,
    });

    await page.goto("/fr/tools/graphic-maker/");
    await assertSeoBasics(page, {
      titleIncludes: /Créateur de graphiques|UnionOps/i,
      canonicalPath: "/fr/tools/graphic-maker/",
      ogUrlIncludes: "/fr/tools/graphic-maker/",
      hreflang: true,
    });
  });

  test("robots.txt and sitemap.xml are reachable", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsBody = await robots.text();
    expect(robotsBody).toMatch(/Sitemap:/i);
    expect(robotsBody).toMatch(/Disallow:.*\/api\//);
    expect(robotsBody).not.toMatch(/Disallow:.*\/en\/app\//);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const xml = await sitemap.text();
    expect(xml).toContain("https://unionops.org/en/");
    expect(xml).toContain("https://unionops.org/fr/");
    expect(xml).not.toContain("/en/app/");
  });

  test("locale-less public paths redirect on the same host", async ({
    request,
    baseURL,
  }) => {
    const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
    for (const path of ["/examples/", "/privacy/", "/tools/", "/assets/"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([301, 302, 307, 308]).toContain(res.status());
      const location = res.headers()["location"];
      expect(location).toBeTruthy();
      const target = new URL(location!, origin);
      expect(target.origin).toBe(origin);
      expect(target.pathname).toMatch(/^\/(en|fr)\//);
      // Must not long-cache HTML/locale redirects (esp. /assets/).
      const cache = res.headers()["cache-control"] ?? "";
      expect(cache).not.toMatch(/max-age=31536000/);
      expect(cache).not.toMatch(/immutable/);
    }
  });

  test("guide and privacy self-canonicalize (not home)", async ({ page }) => {
    await page.goto("/en/guide/print/");
    await assertSeoBasics(page, {
      titleIncludes: /Print|UnionOps/i,
      canonicalPath: "/en/guide/print/",
      ogUrlIncludes: "/en/guide/print/",
      hreflang: true,
    });

    await page.goto("/en/privacy/");
    await assertSeoBasics(page, {
      titleIncludes: /Privacy|UnionOps/i,
      canonicalPath: "/en/privacy/",
      ogUrlIncludes: "/en/privacy/",
      hreflang: true,
    });
  });

  test("tools index and union-boards guide self-canonicalize", async ({
    page,
  }) => {
    await page.goto("/en/tools/");
    await assertSeoBasics(page, {
      titleIncludes: /Tools|Toolbox|UnionOps/i,
      canonicalPath: "/en/tools/",
      ogUrlIncludes: "/en/tools/",
      hreflang: true,
    });

    await page.goto("/fr/guide/union-boards/");
    await assertSeoBasics(page, {
      titleIncludes: /tableau|board|UnionOps/i,
      canonicalPath: "/fr/guide/union-boards/",
      ogUrlIncludes: "/fr/guide/union-boards/",
      hreflang: true,
    });
  });

  test("hub login is noindex and reachable from app redirect", async ({
    page,
  }) => {
    await page.goto("/en/app/");
    await expect(page).toHaveURL(/\/en\/app\/login/);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/i);
  });

  test("unknown path shows Local 404 chrome not Next stock", async ({
    page,
  }) => {
    await page.goto("/en/this-path-does-not-exist-local-404");
    await expect(
      page.getByRole("heading", { name: /Local 404|Section 404/i }),
    ).toBeVisible();
    await expect(page.getByText("Solidarity.")).toBeVisible();
    await expect(page).not.toHaveTitle(/This page could not be found/i);
  });
});
