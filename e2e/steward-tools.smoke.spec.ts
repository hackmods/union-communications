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

  test("steward playbooks hub lists practice workspaces", async ({ page }) => {
    await page.goto("/en/guide/steward-playbooks/#workspaces");
    await expect(
      page.getByRole("heading", { name: "Steward playbooks", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Complaint vs grievance/i }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });
});
