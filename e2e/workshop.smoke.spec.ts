import { test, expect } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers/axe";
import { assertNoHorizontalOverflow } from "./helpers/layout";

/**
 * End-to-end coverage for From Scratch to Solidarity (Phase A).
 * Tagged @smoke for CI/demo gates.
 */
test.describe("Workshop demo path E2E @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("home WorkshopDemoPath links Logo Builder → Social Examples → Graphic Maker → Quote Card → Website Template", async ({
    page,
  }) => {
    await page.goto("/en/");
    const heading = page.getByRole("heading", {
      name: /Demo this in about 20 minutes/i,
    });
    await expect(heading).toBeVisible();

    const demoSection = page.locator("section").filter({ has: heading });
    const stepLogo = demoSection.getByRole("link", { name: /Logo Builder/i });
    const stepExamples = demoSection.getByRole("link", {
      name: /Social Examples/i,
    });
    const stepGraphic = demoSection.getByRole("link", {
      name: /Graphic Maker/i,
    });
    const stepQuote = demoSection.getByRole("link", { name: /Quote Card/i });
    const stepWebsite = demoSection.getByRole("link", {
      name: /Website Template/i,
    });

    await expect(stepLogo).toHaveAttribute("href", /\/tools\/logo-builder\/?$/);
    await expect(stepExamples).toHaveAttribute("href", /\/examples\/?$/);
    await expect(stepGraphic).toHaveAttribute(
      "href",
      /\/tools\/graphic-maker\/?$/,
    );
    await expect(stepQuote).toHaveAttribute("href", /\/tools\/quote-card\/?$/);
    await expect(stepWebsite).toHaveAttribute(
      "href",
      /\/tools\/website-template\/?$/,
    );

    await stepGraphic.click();
    const trail = page.getByRole("navigation", {
      name: /20-minute demo path/i,
    });
    await expect(trail).toBeVisible();
    await expect(trail.getByText("Graphic Maker")).toBeVisible();
    await trail.getByRole("link", { name: /Website Template/i }).click();
    await expect(
      page.getByRole("heading", { name: /Website Template/i }),
    ).toBeVisible();

    await page.goto("/en/brand-kit/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: /20-minute demo path/i }),
    ).toBeVisible();
  });

  test("Graphic Maker has no demo trail on a cold visit", async ({ page }) => {
    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("heading", { name: /Graphic Maker/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: /20-minute demo path/i }),
    ).toHaveCount(0);
  });

  test("home Comms path Brand Kit CTA joins the demo trail", async ({ page }) => {
    await page.goto("/en/");
    await page
      .getByTestId("home-path-comms")
      .getByRole("link", { name: /Set up your local brand|Open First week|Open Brand Kit/i })
      .click();
    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("navigation", { name: /20-minute demo path/i }),
    ).toBeVisible();
  });

  test("First week demo chips join the trail", async ({ page }) => {
    await page.goto("/en/guide/social-media-plan/");
    const heading = page.getByRole("heading", {
      name: /Demo this in about 20 minutes/i,
    });
    const demoSection = page.locator("section").filter({ has: heading });
    await demoSection.getByRole("link", { name: /Logo Builder/i }).click();
    await expect(
      page.getByRole("navigation", { name: /20-minute demo path/i }),
    ).toBeVisible();
    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("navigation", { name: /20-minute demo path/i }),
    ).toBeVisible();
  });

  test("Website Template is the fifth trail stop", async ({
    page,
  }) => {
    await page.goto("/en/guide/social-media-plan/");
    const heading = page.getByRole("heading", {
      name: /Demo this in about 20 minutes/i,
    });
    const demoSection = page.locator("section").filter({ has: heading });
    await demoSection.getByRole("link", { name: /Logo Builder/i }).click();
    await page.goto("/en/tools/quote-card/");
    const trail = page.getByRole("navigation", {
      name: /20-minute demo path/i,
    });
    await expect(trail).toBeVisible();
    await expect(
      trail.getByRole("link", { name: /Website Template/i }),
    ).toBeVisible();
    await trail.getByRole("link", { name: /Website Template/i }).click();
    await expect(
      page.getByRole("heading", { name: /Website Template/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: /20-minute demo path/i }),
    ).toBeVisible();
  });

  test("First week primary buttons join the trail", async ({ page }) => {
    await page.goto("/en/guide/social-media-plan/");
    await page
      .locator("#step-print")
      .getByRole("link", { name: /Flyer Maker/i })
      .click();
    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("navigation", { name: /20-minute demo path/i }),
    ).toBeVisible();
  });

  test("workshop outline EN + FR render", async ({ page }) => {
    await page.goto("/en/guide/workshop/");
    await expect(
      page.getByRole("heading", {
        name: /From Scratch to Solidarity: Launching Your Local's Social Media/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What to bring" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Suggested outline" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Next steps" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Demo this in about 20 minutes/i }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /The live path is Logo Builder, Social Examples, Graphic Maker, Quote Card, then Website Template/i,
      ),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await page.goto("/fr/guide/workshop/");
    await expect(
      page.getByRole("heading", {
        name: /De zéro à la solidarité : lancer les médias sociaux de votre section/i,
      }),
    ).toBeVisible();
  });

  test("first week shows calendar and demo path", async ({ page }) => {
    await page.goto("/en/guide/social-media-plan/");
    await expect(page.getByRole("heading", { name: "First week" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Four-week starter calendar/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Demo this in about 20 minutes/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/The 20-minute demo skips print/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Graphic Maker and Quote Card from the live demo/i),
    ).toBeVisible();
  });

  test("demo quartet surfaces: logo builder, examples, graphic maker, quote card", async ({
    page,
  }) => {
    await page.goto("/en/tools/logo-builder/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/en/examples/");
    await expect(
      page.getByRole("heading", { name: /Social Examples/i }),
    ).toBeVisible();

    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("heading", { name: /Graphic Maker/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Download PNG/i }),
    ).toBeVisible();

    await page.goto("/en/tools/quote-card/");
    await expect(
      page.getByRole("heading", { name: /Quote Card/i }),
    ).toBeVisible();
  });

  test("graphic maker mobile Edit/Preview has no horizontal overflow @mobile", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "chromium-mobile project only",
    );
    await page.goto("/en/tools/graphic-maker/");
    await expect(page.getByRole("tab", { name: /Edit/i })).toBeVisible();
    await page.getByRole("tab", { name: /Preview/i }).click();
    await assertNoHorizontalOverflow(page);
    await page.getByRole("button", { name: /Back to edit/i }).click();
    await assertNoHorizontalOverflow(page);
  });

  test("resources checklist and workshop link present", async ({ page }) => {
    await page.goto("/en/guide/resources/");
    await expect(
      page.getByRole("heading", { name: /Comms Resources/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Workshop outline/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Practice checklist/i }),
    ).toBeVisible();
  });
});
