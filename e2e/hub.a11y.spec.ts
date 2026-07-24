import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";
import { expectNoSeriousA11yViolations } from "./helpers/axe";

/**
 * Authenticated Hub axe coverage (UI-003) — one representative page per
 * major module. Relies on demo login + MFA via `loginAsDemoOfficer`.
 */
const HUB_A11Y_PAGES: {
  path: string;
  heading: RegExp;
  label: string;
}[] = [
  {
    label: "grievances",
    path: "/en/app/grievances",
    heading: /Grievance Tracking|Suivi des griefs/i,
  },
  {
    label: "bumping",
    path: "/en/app/bumping",
    heading: /Stability Committee|Comité de stabilité/i,
  },
  {
    label: "time",
    path: "/en/app/time",
    heading: /Workforce Time|Temps de travail|Time administration|Administration du temps/i,
  },
  {
    label: "calendar",
    path: "/en/app/calendar",
    heading: /Officer calendar|Calendrier des dirigeants/i,
  },
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
    label: "documents",
    path: "/en/app/documents",
    heading: /Local documents|Documents locaux/i,
  },
  {
    label: "audit",
    path: "/en/app/audit",
    heading: /Audit log|Journal d[’']audit/i,
  },
  {
    label: "meetings",
    path: "/en/app/meetings",
    heading: /Meeting schedule|Horaire des assembl/i,
  },
  {
    label: "polls",
    path: "/en/app/polls",
    heading: /Pulse polls|Sondages Pulse/i,
  },
  {
    label: "officers",
    path: "/en/app/officers",
    heading: /Officer roster|Liste des dirigeants/i,
  },
  {
    label: "travel",
    path: "/en/app/travel",
    heading: /Travel authorization|Autorisation de/i,
  },
];

test.describe("Hub authenticated a11y @smoke", () => {
  // Parallel MFA logins race the session cookie / JSON body (flaky under workers).
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsDemoOfficer(page);
  });

  for (const { path, heading, label } of HUB_A11Y_PAGES) {
    test(`${label} has no serious or critical a11y violations`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible({ timeout: 20_000 });
      // Prefer settled UI (skip transient loading shells) when present.
      const busy = page.locator('[aria-busy="true"]');
      if ((await busy.count()) > 0) {
        await expect(busy).toHaveCount(0, { timeout: 20_000 });
      }
      await expectNoSeriousA11yViolations(page);
    });
  }
});
