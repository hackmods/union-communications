import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow } from "./helpers/layout";

test.describe("Comms design treatments @smoke", () => {
  test("starter palettes and saved Looks switch without changing treatment", async ({ page }) => {
    await page.goto("/en/create/brand-kit/");
    await page.getByLabel(/^Union preset$|^Union$/).selectOption("cupe");
    const original = page.getByRole("button", { name: "Original colours" });
    const deeper = page.getByRole("button", { name: "Deeper colour" });
    await expect(original).toBeVisible();
    await deeper.click();
    await page.getByRole("textbox", { name: "Look name" }).fill("Local council");
    await page.getByRole("button", { name: "Save current colours and logo" }).click();
    const saved = page.getByRole("button", { name: "Local council" });
    await expect(saved).toBeVisible();
    await original.click();
    await saved.click();
    await expect(page.getByRole("radio", { name: "Balanced" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("status").getByText("Changes saved successfully")).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("unionops-brand-kit") || "{}"));
    expect(stored.savedLooks?.[0]?.name).toBe("Local council");
    expect(stored.primaryColor).toBe(stored.savedLooks[0].primaryColor);
  });

  test("new Brand Kits start Balanced and makers can override, undo, and reset", async ({ page }) => {
    await page.goto("/en/create/brand-kit/");
    const balanced = page.getByRole("radio", { name: "Balanced" });
    await expect(balanced).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Mostly white" }).click();
    await expect(page.getByTestId("brand-kit-preview")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.getByRole("status").getByText("Changes saved successfully")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("radio", { name: "Mostly white" })).toHaveAttribute("aria-checked", "true");

    await page.goto("/en/tools/flyer-maker/");
    await expect(page.getByRole("radio", { name: "Mostly white" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Full colour" }).click();
    await expect(page.getByRole("radio", { name: "Full colour" })).toHaveAttribute("aria-checked", "true");
    const history = page.getByRole("toolbar", { name: "Edit history" });
    await history.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("radio", { name: "Mostly white" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Balanced" }).click();
    await history.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByRole("radio", { name: "Mostly white" })).toHaveAttribute("aria-checked", "true");
  });

  test("the treatment control fits a narrow French editor", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/fr/tools/flyer-maker/");
    await expect(page.getByRole("radio", { name: "Équilibrée" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
