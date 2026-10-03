import { expect, test } from "@playwright/test";

test.describe("Access request forms @smoke", () => {
  test("request-access submits and shows the received message", async ({
    page,
  }) => {
    await page.goto("/en/request-access/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Request member access",
    );
    await expect(
      page.getByText("If an earlier try failed, send it again"),
    ).toBeVisible();
    await page.getByLabel("Your name").fill("Alex Rivera");
    await page.getByLabel("Email").fill("alex.smoke@example.test");
    await page
      .locator("#access-request-form")
      .getByRole("textbox", { name: "Union", exact: true })
      .fill("CAAT");
    await page.getByLabel("Local name or number").fill("243");
    await page.getByLabel(/I agree that UnionOps/).check();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(
      page.getByText("Thanks. Your request was received."),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("join submits a local request after choosing Officer Hub", async ({
    page,
  }) => {
    await page.goto("/en/join/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Bring your local to UnionOps",
    );
    await page.getByRole("link", { name: "Request member access" }).click();
    await expect(page).toHaveURL(/\/en\/request-access\/?/);
    await page.goBack();

    await page.getByLabel("Your name").fill("Jordan Lee");
    await page.getByLabel("Email").fill("jordan.smoke@example.test");
    await page
      .locator("#access-request-form")
      .getByRole("textbox", { name: "Union", exact: true })
      .fill("CAAT");
    await page.getByLabel("Local name or number").fill("243");
    await page.getByLabel("Officer Hub").check();
    await page.getByLabel(/I agree that UnionOps/).check();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(
      page.getByText("Thanks. Your request was received."),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("login page member access link opens the request form", async ({
    page,
  }) => {
    await page.goto("/en/app/login/");
    await page.getByRole("link", { name: "Request member access" }).click();
    await expect(page).toHaveURL(/\/en\/request-access\/?/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Request member access",
    );
    await expect(page.locator("#access-request-form")).toBeVisible();
  });
});
