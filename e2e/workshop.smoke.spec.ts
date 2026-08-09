import { test, expect } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers/axe";
import { assertNoHorizontalOverflow } from "./helpers/layout";

/**
 * End-to-end coverage for the “Starting Your Local Social Communications”
 * facilitator path (Phase A). Tagged @smoke for CI/demo gates.
 */
test.describe("Workshop demo path E2E @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/");
    await page.evaluate(() => localStorage.clear());
  });

  test("home WorkshopDemoPath links Brand Kit → Board Notice → Graphic Maker → Captions", async ({
    page,
  }) => {
    await page.goto("/en/");
    const heading = page.getByRole("heading", {
      name: /Demo this in about 20 minutes/i,
    });
    await expect(heading).toBeVisible();

    const demoSection = page.locator("section").filter({ has: heading });
    const stepBrand = demoSection.getByRole("link", { name: /Brand Kit/i });
    const stepBoard = demoSection.getByRole("link", { name: /Board Notice/i });
    const stepGraphic = demoSection.getByRole("link", {
      name: /Graphic Maker/i,
    });
    const stepCaptions = demoSection.getByRole("link", { name: /Captions/i });

    await expect(stepBrand).toHaveAttribute("href", /\/brand-kit\/?$/);
    await expect(stepBoard).toHaveAttribute("href", /\/tools\/board-notice\/?$/);
    await expect(stepGraphic).toHaveAttribute(
      "href",
      /\/tools\/graphic-maker\/?$/,
    );
    await expect(stepCaptions).toHaveAttribute("href", /\/captions\/?$/);

    await page.goto("/en/brand-kit/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("workshop outline EN + FR render", async ({ page }) => {
    await page.goto("/en/guide/workshop/");
    await expect(
      page.getByRole("heading", {
        name: /Workshop: Starting local social communications/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Suggested outline/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await page.goto("/fr/guide/workshop/");
    await expect(
      page.getByRole("heading", {
        name: /Atelier : démarrer les communications sociales locales/i,
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
  });

  test("demo quartet surfaces: board notice, graphic maker, captions", async ({
    page,
  }) => {
    await page.goto("/en/tools/board-notice/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Download PDF/i }),
    ).toBeVisible();

    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("heading", { name: /Graphic Maker/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Download PNG/i }),
    ).toBeVisible();

    await page.goto("/en/captions/");
    await expect(
      page.getByRole("heading", { name: /Caption & Hashtag Library/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy/i }).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Open Graphic Maker/i }),
    ).toHaveAttribute("href", /\/tools\/graphic-maker\/?$/);
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
