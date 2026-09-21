import { expect, test } from "@playwright/test";
import { loginAsPresident } from "./helpers/auth";

test.describe("grievance intake @smoke", () => {
  test("president can create a restricted pseudonym-only case", async ({ page }) => {
    await loginAsPresident(page);
    await page.goto("/en/app/grievances/new");

    await expect(page.getByRole("heading", { name: "New grievance" })).toBeVisible();
    const privacy = page.getByLabel("Privacy level");
    await expect(privacy).toBeVisible();
    await privacy.selectOption("restricted");
    await expect(page.getByText(/Restricted cases are hidden from presidents/)).toBeVisible();

    const marker = `Intake smoke ${Date.now()}`;
    await page.getByLabel("Member pseudonym").fill(marker);
    const createResponse = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/api/grievances/",
    );
    await page.getByRole("button", { name: "Create grievance" }).click();
    expect((await createResponse).status()).toBe(201);

    await expect(page).toHaveURL(/\/en\/app\/grievances\/(?!new\/?$)[^/]+\/?$/);
    await expect(page.getByRole("heading", { name: "Access and privacy" })).toBeVisible();
    await expect(page.getByText(/Restricted cases are hidden from the president/)).toBeVisible();
  });
});
