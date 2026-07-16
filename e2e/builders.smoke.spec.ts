import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { assertNoHorizontalOverflow } from "./helpers/layout";

function seriousOrCriticalViolations(
  violations: { impact?: string | null }[],
) {
  return violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

const CANVAS_TOOLS = [
  "/en/tools/board-notice/",
  "/en/tools/logo-builder/",
  "/en/tools/graphic-maker/",
  "/en/tools/flyer-maker/",
  "/en/tools/quote-card/",
  "/en/tools/qr-card/",
  "/en/tools/qr-board/",
  "/en/tools/meeting-background/",
  "/en/tools/solidarity-poster/",
  "/en/tools/resizer/",
  "/en/tools/website-template/",
  "/en/tools/board-banner/",
] as const;

test.describe("Home hero & builders smoke @smoke", () => {
  test("home hero shows brand mark, slogan, and CTAs", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.getByTestId("home-hero-brand")).toBeVisible();
    await expect(page.getByText("Solidarity.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Get started" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Set up your local brand" }),
    ).toBeVisible();
    await expect(page.getByText(/Local-first Comms/i)).toBeVisible();
  });

  test("graphic maker renders with download", async ({ page }) => {
    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("heading", { name: /Graphic Maker/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  });

  test("flyer maker renders with download", async ({ page }) => {
    await page.goto("/en/tools/flyer-maker/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  });

  test("quote card renders with download", async ({ page }) => {
    await page.goto("/en/tools/quote-card/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  });

  test("resizer renders", async ({ page }) => {
    await page.goto("/en/tools/resizer/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("alt-text assistant renders", async ({ page }) => {
    await page.goto("/en/tools/alt-text/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("document generator renders", async ({ page }) => {
    await page.goto("/en/tools/document-generator/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("logo builder shows preview and download", async ({ page }) => {
    await page.goto("/en/tools/logo-builder/");
    await expect(
      page.getByRole("heading", { name: "Local Logo Builder" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  });

  test("graphic maker has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/tools/graphic-maker/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("logo builder has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/tools/logo-builder/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });
});

test.describe("Public secondary pages smoke @smoke", () => {
  const pages: { path: string; heading: string | RegExp }[] = [
    { path: "/en/onboarding/", heading: "Set up your local brand" },
    { path: "/en/assets/", heading: "Brand Asset Pack" },
    { path: "/en/manifesto/", heading: /Why UnionOps is free/i },
    { path: "/en/install/", heading: "Install UnionOps on your desktop" },
    { path: "/en/guide/print/", heading: "Print Communications Guide" },
    { path: "/en/guide/crisis/", heading: "Strike & Crisis Comms Guide" },
    { path: "/en/guide/website/", heading: "Local Website Guide" },
    { path: "/en/accessibility/", heading: "Accessibility Statement" },
  ];

  for (const { path, heading } of pages) {
    test(`${path} renders`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    });
  }

  test("print guide has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/guide/print/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });
});

test.describe("Mobile tool chrome @smoke @mobile", () => {
  for (const path of CANVAS_TOOLS) {
    test(`${path} Edit/Preview toggle without overflow`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("tab", { name: "Edit" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
      await page.getByRole("tab", { name: "Preview" }).click();
      await assertNoHorizontalOverflow(page);
    });
  }

  test("home hero brand visible on mobile without overflow", async ({
    page,
  }) => {
    await page.goto("/en/");
    await expect(page.getByTestId("home-hero-brand")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("mobile nav drawer opens and navigates", async ({ page }) => {
    await page.goto("/en/");
    await page.getByTestId("mobile-nav-toggle").click();
    await expect(page.getByTestId("mobile-nav-drawer")).toBeVisible();
    await page
      .getByTestId("mobile-nav-drawer")
      .getByRole("link", { name: /Logo Builder|Créateur de logo/i })
      .click();
    await expect(page).toHaveURL(/\/en\/tools\/logo-builder/);
    await assertNoHorizontalOverflow(page);
  });

  test("brand kit and onboarding have no overflow", async ({ page }) => {
    await page.goto("/en/brand-kit/");
    await assertNoHorizontalOverflow(page);
    await page.goto("/en/onboarding/");
    await assertNoHorizontalOverflow(page);
  });
});
