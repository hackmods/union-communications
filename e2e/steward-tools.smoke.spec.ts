import { test, expect } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./helpers/axe";

/**
 * Steward prep workspaces — public tools + Hub board.
 * Tagged @smoke for launch gate.
 */
test.describe("Steward meeting guides @smoke", () => {
  test("complaint vs grievance loads and scores a point", async ({ page }) => {
    await page.goto("/en/tools/complaint-vs-grievance/");
    await expect(
      page.getByRole("heading", { name: /Complaint vs grievance diagnostic/i }),
    ).toBeVisible();
    await page
      .getByRole("radiogroup", {
        name: /1\. Collective agreement violation/i,
      })
      .getByRole("radio", { name: "Yes" })
      .click();
    await expect(page.getByText(/Grievance viability index/i).first()).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("pre-disciplinary log loads with ladder diagram", async ({ page }) => {
    await page.goto("/en/tools/pre-disciplinary-log/");
    await expect(
      page.getByRole("heading", { name: /Pre-disciplinary meeting log/i }),
    ).toBeVisible();
    await expect(page.getByText(/Progressive discipline ladder/i)).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("RTW workspace loads with Meiorin reference", async ({ page }) => {
    await page.goto("/en/tools/rtw-accommodation/");
    await expect(
      page.getByRole("heading", { name: /Return-to-work & accommodation/i }),
    ).toBeVisible();
    await expect(page.getByText(/Primacy of human rights/i)).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("proposal tracker loads with trust banner and add row", async ({
    page,
  }) => {
    await page.goto("/en/tools/proposal-tracker/");
    await expect(
      page.getByRole("heading", { name: /Proposal Tracker/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Bargaining strategy is confidential/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Add Proposal/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("rules of order cheat sheet loads and shows motion card", async ({
    page,
  }) => {
    await page.goto("/en/tools/rules-of-order/");
    await expect(
      page.getByRole("heading", { name: /Rules of Order Cheat Sheet/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /What do you want to do\?/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Copy phrase/i }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Point out that the rules are being broken/i })
      .click();
    await expect(page.getByText(/Point of order!/i)).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("running meetings guide loads full playbook sections", async ({
    page,
  }) => {
    await page.goto("/en/guide/running-meetings/");
    await expect(
      page.getByRole("heading", {
        name: /Running a Meeting & Robert's Rules/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Quorum before you vote/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Which motion comes first\?/i }),
    ).toBeVisible();
    await expect(
      page
        .locator("#tool")
        .getByRole("link", { name: /Rules of Order Cheat Sheet/i }),
    ).toBeVisible();
    await expect(
      page
        .locator("#agenda")
        .getByRole("link", { name: /Land acknowledgement/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("land acknowledgement guide loads playbook sections", async ({
    page,
  }) => {
    await page.goto("/en/guide/land-acknowledgement/");
    await expect(
      page.getByRole("heading", { name: /Land Acknowledgement Guide/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /How to write your acknowledgement/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Prepare your words/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Floor handout \(one page\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /How major unions approach it/i }),
    ).toBeVisible();
    await expect(
      page
        .locator("#howToWrite")
        .getByRole("button", { name: /Download floor handout/i }),
    ).toBeVisible();
    await expect(
      page.locator("#atMeeting").getByRole("link", { name: /Running meetings/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test("steward playbooks hub lists practice workspaces", async ({ page }) => {
    await page.goto("/en/guide/steward-playbooks/#workspaces");
    await expect(
      page.getByRole("heading", { name: "Steward playbooks", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator("#workspaces")
        .getByRole("link", { name: /Complaint vs grievance/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });
});
