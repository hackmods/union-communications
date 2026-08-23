import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  loginAsMember,
  loginAsPresident,
  loginAsSteward,
  hubLogin,
} from "./helpers/auth";

function seriousOrCriticalViolations(
  violations: { impact?: string | null }[],
) {
  return violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

async function openBulletinWriter(page: Page) {
  await page.getByRole("tab", { name: "Bulletin" }).click();
  await expect(page.getByPlaceholder("Bulletin title")).toBeVisible();
}

test.describe("Local Portal smoke @smoke", () => {
  test("unauthenticated portal redirects to login", async ({ page }) => {
    await page.goto("/en/portal");
    await expect(page).toHaveURL(/\/en\/app\/login/);
  });

  test("member visiting Officer Hub home is sent to Together", async ({
    page,
  }) => {
    await loginAsMember(page);
    await page.goto("/en/app");
    await expect(page).toHaveURL(/\/en\/portal\/?(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Together" })).toBeVisible();
  });

  test("member reaches Together without MFA", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/portal");
    await expect(page.getByRole("heading", { name: "Together" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your Circles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Hall" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coming up" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Membership meeting", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Local 243 Hall" }).first()).toBeVisible();
    const portalNav = page.getByRole("navigation", { name: "Portal navigation" });
    await expect(portalNav).toBeVisible();
    await expect(portalNav.getByRole("link", { name: "Dispatch" })).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Local Portal" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("Together has no serious or critical a11y violations", async ({
    page,
  }) => {
    await loginAsMember(page);
    await page.goto("/en/portal");
    await expect(page.getByRole("heading", { name: "Together" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("member opens Hall and posts Bulletin", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/portal");
    await page.getByRole("link", { name: "Local 243 Hall" }).click();
    await expect(page).toHaveURL(/\/en\/portal\/circles\/circle-hall-243/);
    await expect(
      page.getByRole("heading", { name: "Local 243 Hall" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Many hands" })).toHaveCount(0);

    await openBulletinWriter(page);
    const stamp = Date.now();
    await page.getByPlaceholder("Bulletin title").fill(`Smoke bulletin ${stamp}`);
    await page
      .getByPlaceholder("Write for the record…")
      .fill("Playwright end-to-end Bulletin post.");
    await page.getByRole("button", { name: "Post to Bulletin" }).click();
    await expect(page.getByText(`Smoke bulletin ${stamp}`)).toBeVisible();
  });

  test("member promotes Bulletin to Action and completes it", async ({
    page,
  }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/circles/circle-hall-243");
    await openBulletinWriter(page);

    const stamp = Date.now();
    await page.getByPlaceholder("Bulletin title").fill(`Promote me ${stamp}`);
    await page
      .getByPlaceholder("Write for the record…")
      .fill("Should become an Action.");
    await page.getByRole("button", { name: "Post to Bulletin" }).click();
    await expect(page.getByText(`Promote me ${stamp}`)).toBeVisible();

    const post = page.locator("li").filter({ hasText: `Promote me ${stamp}` });
    await post.getByRole("button", { name: "Make Action" }).click();
    await page.getByRole("tab", { name: "Actions" }).click();
    const actionRow = page.locator("li").filter({ hasText: `Promote me ${stamp}` });
    await expect(actionRow).toBeVisible();
    await actionRow.getByRole("button", { name: "Complete" }).click();
    await expect(
      actionRow.locator("span.line-through").filter({ hasText: `Promote me ${stamp}` }),
    ).toBeVisible();
  });

  test("member uses Calendar, Binder, and Floor on JHSC", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/circles/circle-jhsc-243");

    await page.getByRole("tab", { name: "Calendar" }).click();
    await page.getByPlaceholder("Event title").fill("Smoke walkthrough");
    await page.getByRole("button", { name: "Add to Calendar" }).click();
    await expect(page.getByText("Smoke walkthrough")).toBeVisible();

    await page.getByRole("tab", { name: "Binder" }).click();
    await page.getByPlaceholder("Binder item title").fill("Smoke note");
    await page.getByPlaceholder("Note or link…").fill("Binder memory note.");
    await page.getByRole("button", { name: "Add to Binder" }).click();
    await expect(page.getByText("Smoke note")).toBeVisible();

    await page.getByRole("tab", { name: "Floor" }).click();
    await page.getByPlaceholder("Message the Floor…").fill("Floor smoke ping");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Floor smoke ping")).toBeVisible();
  });

  test("member sees Many hands and Oversight on JHSC", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/circles/circle-jhsc-243");

    await page.getByRole("tab", { name: "Many hands" }).click();
    await expect(page.getByRole("heading", { name: "Backlog" })).toBeVisible();
    await expect(page.getByText("North lot lighting")).toBeVisible();

    await page.getByRole("tab", { name: "Oversight" }).click();
    await expect(page.getByRole("heading", { name: "Overdue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Unassigned" })).toBeVisible();
  });

  test("Dispatch lists items and mark-all-read works", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/dispatch");
    await expect(page.getByRole("heading", { name: "Dispatch" })).toBeVisible();
    await page.getByRole("button", { name: "Mark all read" }).click();
    // After mark-all, unread styling may clear; page stays on Dispatch
    await expect(page).toHaveURL(/\/en\/portal\/dispatch/);
  });

  test("star and mute controls on Circle", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/circles/circle-hall-243");
    const star = page.getByRole("button", { name: /Star Circle|Unstar Circle/ });
    await expect(star).toBeVisible();
    await star.click();
    await page.getByRole("button", { name: /Mute Dispatch|Unmute Dispatch/ }).click();
  });

  test("president creates a Circle from Together", async ({ page }) => {
    await loginAsPresident(page);
    await page.goto("/en/portal");
    await expect(page.getByRole("heading", { name: "Together" })).toBeVisible();
    const name = `Smoke Circle ${Date.now()}`;
    const nameField = page.getByPlaceholder("New committee Circle name");
    const createBtn = page.getByRole("button", { name: "Create Circle" });
    await nameField.scrollIntoViewIfNeeded();
    await nameField.fill(name);
    await expect(nameField).toHaveValue(name);
    await expect(createBtn).toBeEnabled();
    const posted = page.waitForResponse((r) => {
      const path = new URL(r.url()).pathname.replace(/\/$/, "");
      return (
        path === "/api/portal/circles" &&
        r.request().method() === "POST" &&
        r.status() === 201
      );
    });
    await createBtn.click();
    expect((await posted).ok()).toBeTruthy();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Many hands" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "One fight" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Roll Call" })).toBeVisible();
    await page.getByRole("tab", { name: "Many hands" }).click();
    await page.getByRole("button", { name: "Start Many hands" }).click();
    await expect(page.getByRole("button", { name: "Add card" }).first()).toBeVisible();
  });

  test("president can create a Circle for more than one local", async ({
    page,
  }) => {
    await loginAsPresident(page);
    await page.goto("/en/portal");
    await expect(
      page.getByRole("checkbox", { name: "Members from more than one local" }),
    ).toBeVisible();
    const name = `Union Caucus ${Date.now()}`;
    const posted = await page.request.post("/api/portal/circles/", {
      data: {
        name,
        kind: "committee",
        scope: "union",
      },
    });
    expect(posted.status()).toBe(201);
    const body = (await posted.json()) as {
      circle: { id: string; localId?: string; name: string };
    };
    expect(body.circle.localId).toBeFalsy();
    expect(body.circle.name).toBe(name);

    const invited = await page.request.post(
      `/api/portal/circles/${body.circle.id}`,
      {
        data: {
          tool: "roster_invite",
          userId: "user-president-560",
        },
      },
    );
    expect(invited.status()).toBe(201);

    await page.goto(`/en/portal/circles/${body.circle.id}`);
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByText("More than one local")).toBeVisible();
  });

  test("French Together uses solidarity labels", async ({ page }) => {
    await hubLogin(page, "member@local243.ca");
    await expect(page).toHaveURL(/\/en\/portal\/?$/);
    await page.goto("/fr/portal");
    await expect(page.getByRole("heading", { name: "Ensemble" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vos Cercles" })).toBeVisible();
  });

  test("officer with MFA can open Portal module after verify", async ({
    page,
  }) => {
    await loginAsSteward(page);
    await page.goto("/en/portal");
    await expect(page.getByRole("heading", { name: "Together" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "LEC", exact: true })).toBeVisible();
  });

  test("Circle workspace has no serious or critical a11y violations", async ({
    page,
  }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/circles/circle-hall-243");
    await expect(
      page.getByRole("heading", { name: "Local 243 Hall" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);
  });

  test("member opens Hold the line and Sidebars", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/fronts");
    await expect(page.getByRole("heading", { name: "Hold the line" })).toBeVisible();
    await page.goto("/en/portal/sidebars");
    await expect(page.getByRole("heading", { name: "Sidebars" })).toBeVisible();
  });

  test("steward sees One fight on LEC", async ({ page }) => {
    await loginAsSteward(page);
    await page.goto("/en/portal/circles/circle-lec-243");
    await page.getByRole("tab", { name: "One fight" }).click();
    await expect(
      page.getByText("Membership meeting turnout plan"),
    ).toBeVisible();
  });

  test("deep-link opens Actions tab from Together query", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/circles/circle-hall-243?tab=actions");
    await expect(page.getByRole("tab", { name: "Actions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByRole("tab", { name: "Bulletin" }).click();
    await expect(page).toHaveURL(/tab=bulletin/);
    await expect(page.getByRole("tab", { name: "Bulletin" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await openBulletinWriter(page);
    await expect(page.getByPlaceholder("Bulletin title")).toBeVisible();
  });

  test("member can soft-delete Bulletin and download activity pack", async ({
    page,
  }) => {
    await loginAsMember(page);
    await page.goto("/en/portal/circles/circle-hall-243");
    await openBulletinWriter(page);
    const stamp = Date.now();
    await page.getByPlaceholder("Bulletin title").fill(`Delete me ${stamp}`);
    await page
      .getByPlaceholder("Write for the record…")
      .fill("Soft-delete smoke.");
    await page.getByRole("button", { name: "Post to Bulletin" }).click();
    await expect(page.getByText(`Delete me ${stamp}`)).toBeVisible();
    const row = page.locator("li").filter({ hasText: `Delete me ${stamp}` });
    await row.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(`Delete me ${stamp}`)).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download activity pack" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/activity-pack\.json$/);
  });
});
