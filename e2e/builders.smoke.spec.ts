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
  "/en/tools/action-card/",
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
  "/en/tools/action-card/",
  "/en/tools/qr-board/",
  "/en/tools/website-template/",
  "/en/tools/document-generator/",
  "/en/tools/solidarity-poster/",
  "/en/tools/meeting-background/",
  "/en/tools/board-banner/",
  "/en/tools/quote-card/",
  "/en/tools/resizer/",
  "/en/tools/alt-text/",
  "/en/tools/pulse-poll/",
] as const;

test.describe("Home hero & builders smoke @smoke", () => {
  test("home hero shows brand mark, slogan, preview, and CTAs", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.getByTestId("home-hero-brand")).toBeVisible();
    await expect(page.getByTestId("home-hero-preview")).toBeVisible();
    await expect(page.getByText("Solidarity.")).toBeVisible();
    // Hero owns brand setup; Comms path uses pathCommsCta ("Get started") — COPY-001.
    await expect(
      page
        .getByRole("region", { name: /toolkit for local unions/i })
        .getByRole("link", { name: "Set up your local brand" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Open the first-week roadmap|What’s next|What's next/i }).first(),
    ).toBeVisible();
    // Path card only when NEXT_PUBLIC_OFFICER_HUB_PUBLIC is on (CI / soft-launch).
    const pathComms = page.getByTestId("home-path-comms");
    if ((await pathComms.count()) > 0) {
      await expect(pathComms.getByRole("link", { name: "Get started" })).toBeVisible();
      await expect(
        pathComms.getByRole("link", { name: "Set up your local brand" }),
      ).toHaveCount(0);
    }
    await expect(page.getByText(/stays in your browser/i).first()).toBeVisible();
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

  test("French graphic maker has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/fr/tools/graphic-maker/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe("Public secondary pages smoke @smoke", () => {
  const pages: { path: string; heading: string | RegExp }[] = [
    { path: "/en/onboarding/", heading: "Set up your local brand" },
    { path: "/en/assets/", heading: "Brand Assets" },
    { path: "/en/manifesto/", heading: /Why UnionOps is free/i },
    { path: "/en/install/", heading: "Install UnionOps on your desktop" },
    { path: "/en/guide/print/", heading: "Print Communications Guide" },
    { path: "/en/guide/crisis/", heading: "Strike & Crisis Comms Guide" },
    { path: "/en/guide/website/", heading: "Local Website Guide" },
    { path: "/en/guide/union-boards/", heading: "Union Boards Guide" },
    { path: "/en/guide/social-media-plan/", heading: "First week" },
    { path: "/en/guide/photo-consent/", heading: "Photo Consent & Member Media" },
    { path: "/en/guide/resources/", heading: "Comms Resources" },
    {
      path: "/en/guide/membership-signup/",
      heading: "Grow membership with scan-to-sign materials",
    },
    {
      path: "/en/guide/email-broadcast/",
      heading: /Email.*outreach/i,
    },
    { path: "/en/tools/", heading: "Tools" },
    { path: "/en/examples/", heading: "Social Examples" },
    { path: "/en/captions/", heading: "Caption & Hashtag Library" },
    { path: "/en/support/", heading: "Support the builder" },
    { path: "/en/privacy/", heading: "Privacy Policy" },
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

  test("website guide has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/guide/website/");
    await expectNoSeriousA11yViolations(page);
  });

  test("email broadcast guide has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/guide/email-broadcast/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("union-boards guide has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/guide/union-boards/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("tools index has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/tools/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("examples page has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/examples/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: /Brand Kit|Trousse/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Export|Exporter/i })).toBeVisible();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await assertNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: /Current settings|Paramètres/i })).toBeVisible();
    await page.goto("/en/onboarding/");
    await assertNoHorizontalOverflow(page);
  });

  test("wide public shells have no overflow at 1920", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    for (const path of [
      "/en/",
      "/en/tools/",
      "/en/examples/",
      "/en/captions/",
      "/en/assets/",
      "/en/guide/",
      "/en/tools/logo-builder/",
    ] as const) {
      await page.goto(path);
      await assertNoHorizontalOverflow(page);
    }
  });
});
