import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow } from "./helpers/layout";
import { expectNoSeriousA11yViolations } from "./helpers/axe";

test.describe("task-first public discovery @smoke", () => {
  for (const locale of ["en", "fr"] as const) {
    test(`${locale} Start, Create, Learn, and Search render`, async ({ page }) => {
      for (const path of ["/start/", "/create/", "/learn/", "/search/"]) {
        await page.goto(`/${locale}${path}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      }
      const primary = page.getByRole("navigation", {
        name: locale === "en" ? "Site navigation" : "Navigation du site",
      });
      const hubLink = primary.getByRole("link", {
        name: locale === "en" ? "Officer Hub" : "Hub des dirigeants",
        exact: true,
      });
      if (await hubLink.count()) {
        await expect(hubLink).toHaveAttribute("href", `/${locale}/app/`);
      }
      await expect(primary.getByRole("link", { name: locale === "en" ? "Search" : "Rechercher", exact: true }))
        .toHaveCount(0);
      await expect(page.locator("header").getByRole("link", { name: locale === "en" ? "Search" : "Rechercher", exact: true }))
        .toBeVisible();
    });
  }

  test("Home leads into Start and the three task paths", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.getByTestId("home-hero-preview")).toBeVisible();
    await page.getByRole("link", { name: "Choose a path" }).click();
    await expect(page).toHaveURL(/\/en\/start\//);
    await expect(page.getByTestId("start-path-comms")).toBeVisible();
    await expect(page.getByTestId("start-path-steward")).toBeVisible();
    await expect(page.getByTestId("start-path-officer")).toBeVisible();
    await expect(page.getByTestId("start-path-comms").getByRole("link"))
      .toHaveAttribute("href", /\/en\/create\/brand-kit\/$/);
  });

  test("Learn search and filters work locally over the shared catalog", async ({ page }) => {
    await page.goto("/en/learn/");
    await expect(page.getByRole("heading", { name: "Start with a common task" })).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Search" });
    await search.fill("accommodation");
    await expect(page.getByRole("heading", { name: /Human Rights & Accommodation/i }))
      .toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("accommodation");
    await page.getByLabel("Privacy").selectOption("on-device");
    await expect(page.getByRole("heading", { name: /Human Rights & Accommodation/i }))
      .toBeVisible();
    await expect(page.getByRole("status").first()).toContainText(/result/i);
    await expect(page.getByRole("button", { name: "Remove Privacy filter" })).toBeVisible();
    await page.getByRole("button", { name: "Remove Privacy filter" }).click();
    await expect(page.getByLabel("Privacy")).toHaveValue("");
    await expectNoSeriousA11yViolations(page);
  });

  test("localized search terms forgive accents and add task vocabulary", async ({ page }) => {
    await page.goto("/fr/learn/");
    const search = page.getByRole("searchbox", { name: "Rechercher" });
    await search.fill("assemblee generale quorum");
    await expect(page.getByRole("heading", { name: "Tenir une assemblée" })).toBeVisible();
    await search.fill("assemblée générale quorum");
    await expect(page.getByRole("heading", { name: "Tenir une assemblée" })).toBeVisible();
  });

  test("Start shows a saved, resumable steward path on the same device", async ({ page }) => {
    await page.goto("/en/start/?path=steward");
    const journey = page.getByTestId("start-guided-journey");
    await expect(journey).toBeVisible();
    await expect(journey.getByRole("heading", { name: "Represent members at work" })).toBeVisible();
    await expect(journey.getByText("Recommended next step", { exact: true }).first()).toBeVisible();
    await expect(journey.getByText("Your progress is saved only in this browser.")).toBeVisible();
    const done = journey.getByRole("checkbox", { name: "Mark complete" }).first();
    await done.check();
    await expect(journey.getByRole("status")).toContainText("1 of 4 steps complete");
    await page.reload();
    await expect(page.getByTestId("start-guided-journey")
      .getByRole("checkbox", { name: "Mark not complete" }).first()).toBeChecked();
  });

  test("Search accepts a local query and exposes canonical item destinations", async ({ page }) => {
    await page.goto("/en/search/?q=running+meeting");
    await expect(page.getByRole("searchbox", { name: "Search" }))
      .toHaveValue("running meeting");
    await expect(page.locator('a[href="/en/learn/running-meetings/"]'))
      .toHaveAttribute("href", /\/en\/learn\/running-meetings\/$/);
  });

  test("Create and Learn breadcrumbs use localized labels from the catalog", async ({ page }) => {
    await page.goto("/fr/create/brand-kit/");
    const brandBreadcrumbs = page.getByRole("navigation", { name: "Fil d’Ariane" });
    await expect(brandBreadcrumbs.getByRole("link", { name: "Créer", exact: true }))
      .toHaveAttribute("href", "/fr/create/");
    await expect(brandBreadcrumbs.getByText("Trousse de marque", { exact: true }))
      .toHaveAttribute("aria-current", "page");

    await page.goto("/en/learn/running-meetings/");
    const guideBreadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(guideBreadcrumbs.getByRole("link", { name: "Learn", exact: true }))
      .toHaveAttribute("href", "/en/learn/");
    await expect(guideBreadcrumbs.getByText("Running meetings", { exact: true }))
      .toHaveAttribute("aria-current", "page");
  });

  test("legacy routes permanently redirect by locale and preserve query parameters", async ({ page }) => {
    const onboarding = await page.request.get(
      "/en/onboarding/?campaign=fall",
      { maxRedirects: 0 },
    );
    expect(onboarding.status()).toBe(308);
    const onboardingLocation = new URL(onboarding.headers().location!, "http://localhost:3000");
    expect(onboardingLocation.pathname).toBe("/en/start/");
    expect(onboardingLocation.searchParams.get("step")).toBe("brand");
    expect(onboardingLocation.searchParams.get("campaign")).toBe("fall");

    const guide = await page.request.get(
      "/fr/guide/print/?source=bookmark",
      { maxRedirects: 0 },
    );
    expect(guide.status()).toBe(308);
    const guideLocation = new URL(guide.headers().location!, "http://localhost:3000");
    expect(guideLocation.pathname).toBe("/fr/learn/print/");
    expect(guideLocation.searchParams.get("source")).toBe("bookmark");
  });

  test("canonical metadata and sitemap advertise only the new discovery routes", async ({ page }) => {
    await page.goto("/fr/learn/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/fr\/learn\/$/);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]'))
      .toHaveAttribute("href", /\/en\/learn\/$/);
    const sitemap = await page.request.get("/sitemap.xml");
    const xml = await sitemap.text();
    expect(xml).toContain("/en/learn/");
    expect(xml).toContain("/fr/create/");
    expect(xml).not.toContain("/guide/");
    expect(xml).not.toContain("/tools/");
    expect(xml).not.toContain("/guides/");
  });

  test("catalog layouts stay within the viewport at the target widths @mobile", async ({ page }) => {
    for (const width of [375, 768, 1280, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/en/", "/en/start/", "/en/create/", "/en/learn/", "/en/search/"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await assertNoHorizontalOverflow(page);
      }
    }
  });

  test("mobile navigation keeps Search separate from the primary destinations @mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/fr/");
    await page.getByTestId("mobile-nav-toggle").click();
    const drawer = page.getByTestId("mobile-nav-drawer");
    const primary = drawer.getByRole("navigation", { name: "Navigation du site" });
    await expect(primary.getByRole("link", { name: "Commencer", exact: true })).toBeVisible();
    await expect(primary.getByRole("link", { name: "Créer", exact: true })).toBeVisible();
    await expect(primary.getByRole("link", { name: "Apprendre", exact: true })).toBeVisible();
    const hubLink = primary.getByRole("link", { name: "Hub des dirigeants", exact: true });
    if (await hubLink.count()) {
      await expect(hubLink).toHaveAttribute("href", "/fr/app/");
    }
    await expect(primary.getByRole("link", { name: "Rechercher", exact: true })).toHaveCount(0);
    await drawer.getByRole("link", { name: "Rechercher", exact: true }).click();
    await expect(page).toHaveURL(/\/fr\/search\//);
  });

  test("mobile navigation traps keyboard focus, closes on Escape, and returns focus @mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/en/");
    const toggle = page.getByTestId("mobile-nav-toggle");
    await toggle.focus();
    await toggle.click();
    const drawer = page.getByTestId("mobile-nav-drawer");
    await expect(drawer).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("href")))
      .toBe("/en/");
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => drawer.evaluate((panel) => {
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      return document.activeElement === focusable[focusable.length - 1];
    })).toBe(true);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });
});
