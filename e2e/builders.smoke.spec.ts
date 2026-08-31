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
  "/en/tools/org-chart/",
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
  "/en/tools/org-chart/",
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
  test("home hero shows brand mark, slogan, preview, and CTAs", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.getByTestId("home-hero-brand")).toBeVisible();
    await expect(page.getByTestId("home-hero-preview")).toBeVisible();
    await expect(page.getByText("Solidarity.")).toBeVisible();
    // Hero owns brand setup; Comms path uses pathCommsCta ("Get started") — COPY-001.
    await expect(
      page
        .getByRole("region", { name: /look like the union you already are/i })
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
    await expect(page.getByText(/never leaves your browser/i).first()).toBeVisible();
  });

  test("home has no horizontal overflow on a small laptop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/en/");
    await expect(page.getByTestId("home-hero-brand")).toBeVisible();
    await expect(page.getByTestId("home-hero-preview")).toBeVisible();
    // Raw scrollWidth vs clientWidth — do not subtract the scrollbar gutter,
    // or 100vw leftovers look like a false positive (the Windows laptop bug).
    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
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

  test("document generator opens grievance-intake preset from steward-101 link", async ({
    page,
  }) => {
    await page.goto("/en/guide/steward-101/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 60_000,
    });
    await page
      .getByRole("link", { name: "Open grievance intake worksheet" })
      .click();
    await expect(page).toHaveURL(
      /\/en\/tools\/document-generator\/\?preset=grievance-intake/,
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Needs a steward")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Grievance intake", pressed: true }),
    ).toBeVisible();
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

  test("pulse poll authoring is gated for anonymous visitors", async ({
    page,
  }) => {
    await page.goto("/en/tools/pulse-poll/");
    // Hub public (CI default) → login redirect. Soft launch → Local 404.
    const loginHeading = page.getByRole("heading", {
      name: /Officer login|Connexion/i,
    });
    const local404Heading = page.getByRole("heading", {
      name: /Local 404|404 local/i,
    });
    await expect(loginHeading.or(local404Heading)).toBeVisible({
      timeout: 15_000,
    });
  });

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
    { path: "/en/manifesto/", heading: /Built in solidarity/i },
    { path: "/en/updates/", heading: "What's new" },
    { path: "/en/install/", heading: "Install UnionOps as an app" },
    { path: "/en/guide/print/", heading: "Print Communications Guide" },
    { path: "/en/guide/crisis/", heading: "Strike & Crisis Comms Guide" },
    { path: "/en/guide/website/", heading: "Local Website Guide" },
    { path: "/en/guide/union-boards/", heading: "Union Boards Guide" },
    { path: "/en/guide/social-media-plan/", heading: "First week" },
    { path: "/en/guide/photo-consent/", heading: "Photo Consent & Member Media" },
    { path: "/en/guide/resources/", heading: "Comms Resources" },
    {
      path: "/en/guide/membership-signup/",
      heading: "Membership signup playbook",
    },
    {
      path: "/en/guide/email-broadcast/",
      heading: /Email.*outreach/i,
    },
    { path: "/en/guide/short-form/", heading: "Short-form Video Guide" },
    {
      path: "/en/guide/joint-committee/",
      heading: "Joint committee playbook",
    },
    {
      path: "/en/guide/grievance-process/",
      heading: "The Steward's Guide to Grievances",
    },
    {
      path: "/en/guide/workplace-mapping/",
      heading: "Workplace Mapping & Finding Organic Leaders",
    },
    {
      path: "/en/guide/steward-101/",
      heading: "Steward 101: Your Role and Rights",
    },
    {
      path: "/en/guide/officer-learning/",
      heading: "Officer Learning Center",
    },
    {
      path: "/en/guide/officer-learning/contract-enforcement/",
      heading: "Contract Enforcement",
    },
    {
      path: "/en/guide/bylaws/",
      heading: "Local Bylaws: The Rules of Your Local",
    },
    {
      path: "/en/guide/running-meetings/",
      heading: /Running a Meeting.*Robert/i,
    },
    {
      path: "/en/guide/bargaining/",
      heading: "The Bargaining Lifecycle: From Survey to Signing",
    },
    {
      path: "/en/guide/dfr/",
      heading: /Duty of Fair Representation/i,
    },
    {
      path: "/en/guide/seniority-bumping/",
      heading: "Seniority & bumping playbook",
    },
    {
      path: "/en/guide/right-to-refuse/",
      heading: "Right to refuse unsafe work",
    },
    {
      path: "/en/guide/steward-playbooks/",
      heading: "Steward playbooks",
    },
    { path: "/en/tools/", heading: "Tools" },
    { path: "/en/examples/", heading: "Social Examples" },
    { path: "/en/captions/", heading: "Caption & Hashtag Library" },
    { path: "/en/support/", heading: "Support the builder" },
    { path: "/en/privacy/", heading: "Privacy Policy" },
    { path: "/en/accessibility/", heading: "Accessibility Statement" },
    { path: "/en/feedback/", heading: "Help improve UnionOps" },
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

  test("short-form video guide has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/guide/short-form/");
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

  test("updates page has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/updates/");
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

  test("bylaw builder committee mode and OPSEU preset load", async ({
    page,
  }) => {
    await page.goto("/en/tools/bylaw-builder/?mode=committee&preset=opseuCaat");
    await expect(
      page.getByRole("heading", { name: "Bylaw Builder" }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "Committee draft" }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByRole("radio", { name: "OPSEU / SEFPO" }),
    ).toBeVisible();
    await expect(page.getByLabel("Article 1 — Name")).toBeVisible();
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
