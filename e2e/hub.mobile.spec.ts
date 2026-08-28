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

  test("audit log has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/app/audit");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Audit log|Journal d’audit|Journal d'audit/i,
      }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("handoff wizard has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/app/handoff");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Officer handoff wizard|Assistant de passation/i,
      }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("officers roster has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/app/officers");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Officer roster|Liste des dirigeants/i,
      }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("minutes list has no horizontal overflow", async ({ page }) => {
    await page.goto("/en/app/minutes");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Meeting minutes|Procès-verbaux/i,
      }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("hub menu drawer reaches modules and officer tools", async ({ page }) => {
    await page.goto("/en/app");
    await page.getByTestId("hub-nav-toggle").click();
    const drawer = page.getByTestId("hub-nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: /Grievances|Griefs/i }),
    ).toBeVisible();
    await drawer.getByRole("button", { name: /Officer tools|Outils dirigeants/i }).click();
    await drawer.getByRole("link", { name: /^Calendar$|^Calendrier$/i }).click();
    await expect(page).toHaveURL(/\/en\/app\/calendar\/?/);
    await expect(page.getByTestId("hub-nav-drawer")).toHaveCount(0);
  });

  const overflowPages: { path: string; heading: RegExp; label: string }[] = [
    {
      label: "discussions",
      path: "/en/app/discussions",
      heading: /Discussions/i,
    },
    {
      label: "tasks",
      path: "/en/app/tasks",
      heading: /Task board|Tableau des tâches/i,
    },
    {
      label: "checkins",
      path: "/en/app/checkins",
      heading: /Check-ins|Points de suivi/i,
    },
    {
      label: "documents",
      path: "/en/app/documents",
      heading: /Local documents|Documents locaux/i,
    },
    {
      label: "marketplace",
      path: "/en/app/marketplace",
      heading: /Union template marketplace|Marché de modèles syndicaux/i,
    },
    {
      label: "snippets",
      path: "/en/app/snippets",
      heading: /CA clause snippets|Extraits de clauses CA/i,
    },
    {
      label: "hybrid",
      path: "/en/app/hybrid",
      heading: /Hybrid data mode|Mode de donn/i,
    },
    {
      label: "meetings",
      path: "/en/app/meetings",
      heading: /Meeting schedule|Horaire des assembl/i,
    },
    {
      label: "committees",
      path: "/en/app/committees",
      heading: /Committees|Comit/i,
    },
    {
      label: "overdue",
      path: "/en/app/overdue",
      heading: /Overdue dashboard|Tableau des retards/i,
    },
  ];

  for (const { path, heading, label } of overflowPages) {
    test(`${label} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible({ timeout: 20_000 });
      await assertNoHorizontalOverflow(page);
    });
  }
});
