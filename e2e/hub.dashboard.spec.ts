import { test, expect } from "@playwright/test";
import { hubLogin, loginAsMember, loginAsPresident, loginAsSteward, completeMfaIfNeeded } from "./helpers/auth";
import { assertNoHorizontalOverflow } from "./helpers/layout";
import { expectNoSeriousA11yViolations } from "./helpers/axe";
import AxeBuilder from "@axe-core/playwright";

test.describe("Officer Hub task-first home @smoke", () => {
  test.describe.configure({ mode: "serial" });

  test("president sees attention before setup and optional discovery", async ({ page }) => {
    await loginAsPresident(page);
    await page.goto("/en/app");
    const attention = page.getByRole("heading", { name: "What needs my attention?" });
    await expect(attention).toBeVisible();
    await expect(page.getByTestId("hub-attention-widgets")).toBeVisible();
    await expect(page.getByRole("heading", { name: "What can I do next?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Local setup and administration" })).toBeVisible();
    const attentionY = (await attention.boundingBox())!.y;
    const setupY = (await page.getByRole("heading", { name: "Local setup and administration" }).boundingBox())!.y;
    expect(attentionY).toBeLessThan(setupY);
    await expect(page.getByRole("heading", { name: "Your modules" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Local launch checklist" })).toHaveCount(0);
  });

  test("steward gets permitted work without president setup", async ({ page }) => {
    await loginAsSteward(page);
    await page.goto("/en/app");
    await expect(page.getByRole("heading", { name: "What needs my attention?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Local setup and administration" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Platform operator" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Grievances/i }).first()).toBeVisible();
  });

  test("empty work and failed loads have different messages", async ({ page }) => {
    await loginAsPresident(page);
    await page.route((url) => url.pathname.replace(/\/$/, "") === "/api/tasks", (route) =>
      route.fulfill({ json: { tasks: [] } }),
    );
    await page.route((url) => url.pathname.replace(/\/$/, "") === "/api/checkins/mine", (route) =>
      route.fulfill({ json: { pending: [] } }),
    );
    await page.goto("/en/app");
    await expect(page.getByText("No open tasks assigned to you. New assignments will show up here.")).toBeVisible();
    await expect(page.getByText("No unanswered check-ins right now. New questions will appear here.")).toBeVisible();

    await page.unrouteAll();
    await page.route((url) => url.pathname.replace(/\/$/, "") === "/api/tasks", (route) =>
      route.fulfill({ status: 503, json: { error: "unavailable" } }),
    );
    await page.route((url) => url.pathname.replace(/\/$/, "") === "/api/checkins/mine", (route) =>
      route.fulfill({ status: 503, json: { error: "unavailable" } }),
    );
    await page.reload();
    await expect(page.getByText("Could not load your tasks. Open the task board or refresh to try again.")).toBeVisible();
    await expect(page.getByText("Could not load check-ins. Open the check-ins page or refresh to try again.")).toBeVisible();
  });

  test("member goes to the Portal instead of seeing the officer board", async ({ page }) => {
    await loginAsMember(page);
    await page.goto("/en/app");
    await expect(page).toHaveURL(/\/en\/portal\/?$/);
    await expect(page.getByRole("heading", { name: "What needs my attention?" })).toHaveCount(0);
  });

  test("the first work area and responsive navigation fit five widths", async ({ page }) => {
    await loginAsPresident(page);
    await page.goto("/en/app");
    for (const width of [375, 768, 1280, 1536, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await assertNoHorizontalOverflow(page);
      const attention = await page.getByRole("heading", { name: "What needs my attention?" }).boundingBox();
      expect(attention).toBeTruthy();
      expect(attention!.y).toBeLessThan(900);
      if (width < 1536) {
        await expect(page.getByTestId("hub-nav-toggle")).toBeVisible();
      } else {
        await expect(page.getByTestId("hub-nav-toggle")).toBeHidden();
      }
    }
    await page.setViewportSize({ width: 375, height: 900 });
    const toggle = page.getByTestId("hub-nav-toggle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("hub-nav-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("hub-nav-drawer")).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });

  test("French reflows at phone and enlarged-text equivalent widths", async ({ page }) => {
    await loginAsPresident(page);
    await page.goto("/fr/app");
    for (const width of [375, 640]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("heading", { name: "Qu’est-ce qui demande mon attention ?" })).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
    await expectNoSeriousA11yViolations(page);
  });

  test("work and navigation remain usable with forced colours and reduced motion", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 640, height: 900 });
    await loginAsPresident(page);
    await page.goto("/en/app");
    await expect(page.getByRole("heading", { name: "What needs my attention?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open task board" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.getByTestId("hub-nav-toggle").click();
    await expect(page.getByTestId("hub-nav-drawer")).toBeVisible();
  });

  test("dashboard text meets automated colour contrast checks", async ({ page }) => {
    await loginAsPresident(page);
    await page.goto("/en/app");
    await expect(page.getByTestId("hub-attention-widgets")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('[data-testid="hub-dashboard"]')
      .withRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("notices keep their full text available and discovery is optional", async ({ page }) => {
    await loginAsPresident(page);
    await page.goto("/en/app");
    await page.getByText("Read details").click();
    await expect(page.getByText(/temporary storage/i)).toBeVisible();
    const catalog = page.locator("details").filter({ has: page.getByRole("heading", { name: "Officer tools" }) });
    await expect(catalog.getByTestId("hub-officer-tools")).toBeHidden();
    await catalog.locator("summary").click();
    await expect(catalog.getByTestId("hub-officer-tools")).toBeVisible();
  });
});

test.describe("Officer Hub configured MFA @smoke", () => {
  test.skip(process.env.TEST_MFA_LOCKED !== "true", "Run against a host with AUTH_MFA_ENABLED=true");

  test("keeps personal summaries locked until verification", async ({ page }) => {
    await hubLogin(page, "president.7@unionops.test");
    await page.goto("/en/app");
    await expect(page.getByRole("heading", { name: "Verify to see your work" })).toBeVisible();
    await expect(page.getByTestId("hub-attention-widgets")).toHaveCount(0);
    await page.goto("/en/app/mfa");
    await completeMfaIfNeeded(page);
    await page.goto("/en/app");
    await expect(page.getByTestId("hub-attention-widgets")).toBeVisible();
  });
});
