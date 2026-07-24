import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";
import { expectNoSeriousA11yViolations } from "./helpers/axe";
import { assertNoHorizontalOverflow } from "./helpers/layout";

/**
 * Hub dashboards on Pixel 5 — stewards use these on shop-floor phones (UI-002).
 * Includes axe scans on the same routes (UI-003 mobile viewport).
 */
test.describe("Hub dashboards mobile @smoke @mobile", () => {
  // Avoid parallel MFA logins racing session cookies (same as hub.a11y).
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsDemoOfficer(page);
  });

  test("grievances dashboard has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/app/grievances");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Grievance Tracking|Suivi des griefs/i,
      }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("bumping dashboard has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/app/bumping");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Stability Committee|Comité de stabilité/i,
      }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("time dashboard has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/app/time");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Workforce Time|Temps de travail|Time administration|Administration du temps/i,
      }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("grievances has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/app/grievances");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Grievance Tracking|Suivi des griefs/i,
      }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("bumping has no serious or critical a11y violations", async ({
    page,
  }) => {
    await page.goto("/en/app/bumping");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Stability Committee|Comité de stabilité/i,
      }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("time has no serious or critical a11y violations", async ({ page }) => {
    await page.goto("/en/app/time");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Workforce Time|Temps de travail|Time administration|Administration du temps/i,
      }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });
});
