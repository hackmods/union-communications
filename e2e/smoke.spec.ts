import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { USER_PREFERENCES_KEY } from "../src/lib/data/adapter";

test.beforeEach(async ({ page }) => {
  await page.goto("/en/");
  await page.evaluate(() => localStorage.clear());
});

function seriousOrCriticalViolations(
  violations: { impact?: string | null }[],
) {
  return violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

test.describe("Smoke tests @smoke", () => {
  test("home page renders in English", async ({ page }) => {
    await page.goto("/en/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("home page renders in French", async ({ page }) => {
    await page.goto("/fr/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/en/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Get started" })
      .click();
    await expect(page).toHaveURL(/\/en\/onboarding/);
    await page.goto("/en/");
    const main = page.getByRole("navigation", { name: "Main" });
    await main.getByRole("button", { name: /Learn/ }).click();
    // Dropdown anchors use role="menuitem" (not link) while the menu is open.
    await main.getByRole("menuitem", { name: "The Blueprint" }).click();
    await expect(page).toHaveURL(/\/en\/guide\/?$/);
  });

  test("social media plan page renders", async ({ page }) => {
    await page.goto("/en/guide/social-media-plan/");
    await expect(page.getByRole("heading", { name: "Social Media Plan" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Brand Kit" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Logo Builder" }).first()).toBeVisible();
  });

  test("social examples page renders with tool handoff", async ({ page }) => {
    await page.goto("/en/examples/");
    await expect(page.getByRole("heading", { name: "Social Examples" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Make this graphic" }).first(),
    ).toHaveAttribute("href", /graphic-maker\/?\?example=/);
  });

  test("board notice maker page renders", async ({ page }) => {
    await page.goto("/en/tools/board-notice/");
    await expect(page.getByRole("heading", { name: "Board Notice Maker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  });

  test("board banner and trim maker page renders", async ({ page }) => {
    await page.goto("/en/tools/board-banner/");
    await expect(page.getByRole("heading", { name: "Board Banner & Trim" })).toBeVisible();
    // Default frame kit (top+side+bottom) exports a multi-sheet ZIP, not a single PNG.
    await expect(page.getByRole("button", { name: "Download ZIP" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  });

  test("solidarity poster maker page renders", async ({ page }) => {
    await page.goto("/en/tools/solidarity-poster/");
    await expect(page.getByRole("heading", { name: "Solidarity Poster Maker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  });

  test("meeting background maker page renders", async ({ page }) => {
    await page.goto("/en/tools/meeting-background/");
    await expect(page.getByRole("heading", { name: "Meeting Background Maker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  });

  test("qr link card maker page renders", async ({ page }) => {
    await page.goto("/en/tools/qr-card/");
    await expect(page.getByRole("heading", { name: "QR Link Card Maker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  });

  test("qr board poster maker page renders", async ({ page }) => {
    await page.goto("/en/tools/qr-board/");
    await expect(page.getByRole("heading", { name: "QR Board Poster Maker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  });

  test("website template page renders with preview", async ({ page }) => {
    await page.goto("/en/tools/website-template/");
    await expect(page.getByRole("heading", { name: "Website Template" })).toBeVisible();
    await expect(page.getByTitle("Live preview")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download site ZIP" })).toBeVisible();
  });

  test("union boards guide renders", async ({ page }) => {
    await page.goto("/en/guide/union-boards/");
    await expect(page.getByRole("heading", { name: "Union Boards Guide" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bare-minimum board" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Feed the board - posters and templates" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Reference layouts from real locals" }),
    ).toBeVisible();
  });

  test("comms resources page renders with sources", async ({ page }) => {
    await page.goto("/en/guide/resources/");
    await expect(page.getByRole("heading", { name: "Comms Resources" })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "From Scratch to Solidarity: Launching Your Local's Social Media",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Running a workshop" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Full source bibliography" })).toBeVisible();
    await expect(page.getByRole("link", { name: "OPSEU/SEFPO graphics, logos & letterhead" })).toBeVisible();
  });

  test("photo consent guide renders", async ({ page }) => {
    await page.goto("/en/guide/photo-consent/");
    await expect(
      page.getByRole("heading", { name: "Photo Consent & Member Media" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Before you post" })).toBeVisible();
  });

  test("legacy materials URL redirects to resources", async ({ page }) => {
    await page.goto("/en/guide/materials/");
    await expect(page).toHaveURL(/\/en\/guide\/resources\/?/);
    await expect(page.getByRole("heading", { name: "Comms Resources" })).toBeVisible();
  });

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/en/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("font size preference persists across reload", async ({ page }) => {
    await page.goto("/en/accessibility/");
    await page.getByRole("radio", { name: "Larger (20px)" }).check();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-font-size", "larger");
    const fontSize = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(20);
  });

  test("high contrast preference applies data attribute", async ({ page }) => {
    await page.goto("/en/accessibility/");
    await page.getByRole("checkbox", { name: "High contrast" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-high-contrast", "");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-high-contrast", "");
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      USER_PREFERENCES_KEY,
    );
    expect(stored).toContain('"highContrast":true');
  });

  test("guide page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/guide/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("home page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("accessibility page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/accessibility/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("brand kit page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/brand-kit/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("logo builder page renders", async ({ page }) => {
    await page.goto("/en/tools/logo-builder/");
    await expect(page.getByRole("heading", { name: "Local Logo Builder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible();
  });

  test("captions page has copy buttons", async ({ page }) => {
    await page.goto("/en/captions/");
    await expect(page.getByRole("button", { name: "Copy" }).first()).toBeVisible();
  });

  test("brand kit page renders", async ({ page }) => {
    await page.goto("/en/brand-kit/");
    await expect(page.getByRole("heading", { name: "Your local Brand Kit" })).toBeVisible();
  });

  test("privacy page renders", async ({ page }) => {
    await page.goto("/en/privacy/");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });

  test("support page renders", async ({ page }) => {
    await page.goto("/en/support/");
    await expect(page.getByRole("heading", { name: "Support the builder" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Buy me a coffee" }),
    ).toHaveAttribute("href", "https://buymeacoffee.com/ryanmorris");
  });

  test("install page renders and stays out of header nav", async ({ page }) => {
    await page.goto("/en/install/");
    await expect(
      page.getByRole("heading", { name: "Install UnionOps on your desktop" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Support the builder" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to UnionOps" })).toBeVisible();
    // Quiet page: not promoted into header chrome (footer muted link only).
    await expect(
      page.locator("header").getByRole("link", { name: /install/i }),
    ).toHaveCount(0);
    await page.goto("/en/");
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Install as an app" }),
    ).toBeVisible();
  });

  test("unauthenticated hub redirects to login", async ({ page }) => {
    await page.goto("/en/app");
    await expect(page).toHaveURL(/\/en\/app\/login/);
    await expect(page.getByRole("heading", { name: /Officer login|Connexion/i })).toBeVisible();
  });

  test("hub login page has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/app/login");
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("officer can sign in and reach MFA", async ({ page }) => {
    await page.goto("/en/app/login");
    await page.getByLabel(/Email|Courriel/i).fill("president@local243.ca");
    await page.getByLabel(/Password|Mot de passe/i).fill("demo123");
    await page.getByRole("button", { name: /Sign in|Connexion/i }).click();
    await expect(page).toHaveURL(/\/en\/app(\/mfa)?/);
    // President requires MFA — land on MFA or dashboard after prior session
    const onMfa = page.url().includes("/mfa");
    if (onMfa) {
      await expect(
        page.getByRole("heading", { name: /Verify|Vérifiez/i }),
      ).toBeVisible();
      await page.getByLabel(/Verification code|Code de vérification/i).fill("000000");
      await page.getByRole("button", { name: /Verify|Vérifier/i }).click();
      await expect(page).toHaveURL(/\/en\/app\/?$/);
    }
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
