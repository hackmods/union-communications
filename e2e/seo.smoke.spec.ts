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
    expect(robotsBody).toMatch(/Disallow:.*\/en\/app\//);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const xml = await sitemap.text();
    expect(xml).toContain("https://unionops.org/en/");
    expect(xml).toContain("https://unionops.org/fr/");
    expect(xml).not.toContain("/en/app/");
  });

  test("hub login is reachable from app redirect", async ({ page }) => {
    await page.goto("/en/app/");
    await expect(page).toHaveURL(/\/en\/app\/login/);
  });
});
