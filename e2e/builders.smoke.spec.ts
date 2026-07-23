import { test, expect } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers/axe";
import { assertNoHorizontalOverflow } from "./helpers/layout";

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

/** Canvas + related tools that previously lacked axe smoke (UI-003). */
const TOOL_A11Y_PAGES = [
  "/en/tools/graphic-maker/",
  "/en/tools/logo-builder/",
  "/en/tools/board-notice/",
  "/en/tools/flyer-maker/",
  "/en/tools/qr-card/",
  "/en/tools/qr-board/",
  "/en/tools/website-template/",
  "/en/tools/document-generator/",
  "/en/tools/solidarity-poster/",
  "/en/tools/meeting-background/",
  "/en/tools/board-banner/",
  "/en/tools/quote-card/",
  "/en/tools/resizer/",
  "/en/tools/alt-text/",
] as const;

test.describe("Home hero & builders smoke @smoke", () => {
  test("home hero shows brand mark, slogan, and CTAs", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.getByTestId("home-hero-brand")).toBeVisible();
    await expect(page.getByText("Solidarity.")).toBeVisible();
    // Hero + Comms path share the same label when Officer Hub is public.
    await expect(
      page
        .getByRole("region", { name: /toolkit for local unions/i })
        .getByRole("link", { name: "Set up your local brand" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "What’s next" }).first(),
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

  for (const path of TOOL_A11Y_PAGES) {
    test(`${path} has no serious or critical a11y violations`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoSeriousA11yViolations(page);
    });
  }
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
    {
      path: "/en/guide/membership-signup/",
      heading: "Grow membership with scan-to-sign materials",
    },
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
    await expectNoSeriousA11yViolations(page);
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
    const drawer = page.getByTestId("mobile-nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("img", { name: "UnionOps" })).toBeVisible();
    await drawer.getByRole("button", { name: /Tools|Outils/i }).click();
    await drawer
      .getByRole("link", { name: /Logo Builder|Créateur de logo/i })
      .click();
    await expect(page).toHaveURL(/\/en\/tools\/logo-builder/);
    await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
  });

  test("brand kit and onboarding have no overflow", async ({ page }) => {
    await page.goto("/en/brand-kit/");
    await assertNoHorizontalOverflow(page);
    await page.goto("/en/onboarding/");
    await assertNoHorizontalOverflow(page);
  });
});
