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
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible();
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

test.describe("Mobile tool chrome @smoke @mobile", () => {
  test("board notice shows edit/preview toggle without overflow", async ({
    page,
  }) => {
    await page.goto("/en/tools/board-notice/");
    await expect(page.getByRole("tab", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Preview" })).toBeVisible();
    await page.getByRole("tab", { name: "Preview" }).click();
    await assertNoHorizontalOverflow(page);
  });

  test("home hero brand visible on mobile without overflow", async ({
    page,
  }) => {
    await page.goto("/en/");
    await expect(page.getByTestId("home-hero-brand")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
