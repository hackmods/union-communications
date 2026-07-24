import { test, expect } from "@playwright/test";
import { loginAsDemoOfficer } from "./helpers/auth";
import { expectNoSeriousA11yViolations } from "./helpers/axe";

/**
 * Hub org / local-ops surfaces (ORG modules + meetings + invites + onboarding).
 */
const ORG_PAGES: { path: string; heading: RegExp; label: string }[] = [
  {
    label: "officers",
    path: "/en/app/officers",
    heading: /Officer roster|Liste des dirigeants/i,
  },
  {
    label: "committees",
    path: "/en/app/committees",
    heading: /Committees|Comit/i,
  },
  {
    label: "elections",
    path: "/en/app/elections",
    heading: /Nominations & elections|Candidatures et/i,
  },
  {
    label: "minutes",
    path: "/en/app/minutes",
    heading: /Meeting minutes|Proc/i,
  },
  {
    label: "ledger",
    path: "/en/app/ledger",
    heading: /Discretionary fund|fonds discr/i,
  },
  {
    label: "reports",
    path: "/en/app/reports",
    heading: /Local reports|Rapports de la section/i,
  },
  {
    label: "travel",
    path: "/en/app/travel",
    heading: /Travel authorization|Autorisation de/i,
  },
  {
    label: "polls",
    path: "/en/app/polls",
    heading: /Pulse polls|Sondages Pulse/i,
  },
  {
    label: "invites",
    path: "/en/app/invites",
    heading: /Invite officers|Inviter des dirigeants/i,
  },
  {
    label: "onboarding",
    path: "/en/app/onboarding",
    heading: /Tenant setup|Configuration du locataire/i,
  },
  {
    label: "meetings",
    path: "/en/app/meetings",
    heading: /Meeting schedule|Horaire des assembl/i,
  },
];

test.describe("Hub org surfaces @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsDemoOfficer(page);
  });

  for (const { path, heading, label } of ORG_PAGES) {
    test(`${label} loads and is axe-clean`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible({ timeout: 20_000 });
      const busy = page.locator('[aria-busy="true"]');
      if ((await busy.count()) > 0) {
        await expect(busy).toHaveCount(0, { timeout: 20_000 });
      }
      await expectNoSeriousA11yViolations(page);
    });
  }
});
