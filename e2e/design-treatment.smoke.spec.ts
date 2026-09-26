import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { assertNoHorizontalOverflow } from "./helpers/layout";
import { seriousOrCriticalViolations } from "./helpers/axe";

test.describe("Comms design treatments @smoke", () => {
  test("Local pack transfers treatment and a named Look", async ({ page }) => {
    await page.goto("/en/create/brand-kit/");
    const treatment = page.getByRole("radiogroup", { name: "Design treatment" });
    await expect(treatment.getByRole("radio", { name: "Balanced" })).toBeVisible();
    await page.getByLabel(/^Union preset$|^Union$/).selectOption("cupe");
    await page.getByRole("textbox", { name: "Look name" }).fill("Council palette");
    await page.getByRole("button", { name: "Save current colours and logo" }).click();
    await page.getByRole("radio", { name: "Mostly white" }).click();
    await expect(treatment.getByRole("radio", { name: "Mostly white" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect.poll(async () =>
      page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem("unionops-brand-kit") || "{}");
        return stored.designTreatment;
      }),
    ).toBe("paper");

    await page.goto("/en/utilities/local-pack/");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Local pack" }).click();
    const download = await downloadPromise;
    const buffer = readFileSync((await download.path())!);
    const exported = JSON.parse(buffer.toString("utf8"));
    expect(exported.brandKit.designTreatment).toBe("paper");
    expect(exported.brandKit.unionPresetId).toBe("cupe");
    expect(exported.brandKit.savedLooks?.[0]?.name).toBe("Council palette");
    expect(exported.brandKit.savedLooks?.[0]?.unionPresetId).toBe("cupe");

    await page.goto("/en/create/brand-kit/");
    await page.getByRole("radio", { name: "Full colour" }).click();
    await expect(
      page.getByRole("radiogroup", { name: "Design treatment" }).getByRole("radio", {
        name: "Full colour",
      }),
    ).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () =>
      page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem("unionops-brand-kit") || "{}");
        return stored.designTreatment;
      }),
    ).toBe("full");
    await page.goto("/en/utilities/local-pack/");
    await page.locator('input[type="file"]').setInputFiles({
      name: "local-pack.json", mimeType: "application/json", buffer,
    });
    await expect(page.getByText("Local pack loaded.", { exact: false })).toBeVisible();
    await expect.poll(async () => page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem("unionops-brand-kit") || "{}");
      return [stored.unionPresetId, stored.savedLooks?.[0]?.name, stored.designTreatment];
    })).toEqual(["cupe", "Council palette", "paper"]);
    await page.goto("/en/create/brand-kit/");
    await expect(page.getByRole("radio", { name: "Mostly white" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: "Council palette" })).toBeVisible();
  });

  test("a stored kit without treatment opens in Full colour until changed", async ({ page }) => {
    await page.addInitScript(() => {
      const key = "unionops-brand-kit";
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, JSON.stringify({
        version: "2.0",
        local: { id: "legacy-local", localNumber: "404", subText: "Support" },
        unionPresetId: "opseu",
        primaryColor: "#D65B60", secondaryColor: "#FFFFFF", accentColor: "#823038",
        useOfficialLogo: false, logoText: "404",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }));
    });
    await page.goto("/en/create/brand-kit/");
    const treatment = page.getByRole("radiogroup", { name: "Design treatment" });
    await expect(treatment.getByRole("radio", { name: "Full colour" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("textbox", { name: "Local number" })).toHaveValue("404");
    await treatment.getByRole("radio", { name: "Balanced" }).click();
    await expect(treatment.getByRole("radio", { name: "Balanced" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect.poll(async () =>
      page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem("unionops-brand-kit") || "{}");
        return stored.designTreatment;
      }),
    ).toBe("balanced");
    await page.reload();
    await expect(
      page.getByRole("radiogroup", { name: "Design treatment" }).getByRole("radio", {
        name: "Balanced",
      }),
    ).toHaveAttribute("aria-checked", "true");
  });

  test("blocked storage warns while keeping the selected treatment in this session", async ({ page }) => {
    await page.addInitScript(() => {
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "unionops-brand-kit") throw new DOMException("Storage unavailable", "SecurityError");
        return originalSet.call(this, key, value);
      };
    });
    await page.goto("/en/create/brand-kit/");
    await page.getByRole("radio", { name: "Mostly white" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Browser storage is blocked" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Mostly white" })).toHaveAttribute("aria-checked", "true");
  });

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

  test("treatment radios follow the keyboard path on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/create/brand-kit/");
    const group = page.getByRole("radiogroup", { name: "Design treatment" });
    const balanced = group.getByRole("radio", { name: "Balanced" });
    await expect(balanced).toHaveAttribute("aria-checked", "true");
    await balanced.focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "Mostly white" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.keyboard.press("Home");
    await expect(group.getByRole("radio", { name: "Full colour" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.keyboard.press("End");
    await expect(group.getByRole("radio", { name: "Mostly white" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("treatment control meets serious axe contrast on light and dark kits", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "unionops-brand-kit",
        JSON.stringify({
          version: "2.0",
          local: { id: "dark-kit", localNumber: "110", subText: "Support" },
          unionPresetId: "opseu",
          primaryColor: "#142746",
          secondaryColor: "#FFFFFF",
          accentColor: "#30A5B5",
          useOfficialLogo: false,
          logoText: "110",
          designTreatment: "balanced",
          updatedAt: "2026-09-25T00:00:00.000Z",
        }),
      );
    });
    await page.goto("/en/create/brand-kit/");
    const results = await new AxeBuilder({ page })
      .include('[role="radiogroup"][aria-label="Design treatment"]')
      .withRules(["color-contrast"])
      .analyze();
    expect(seriousOrCriticalViolations(results.violations)).toEqual([]);

    await page.evaluate(() => {
      localStorage.setItem(
        "unionops-brand-kit",
        JSON.stringify({
          version: "2.0",
          local: { id: "light-kit", localNumber: "110", subText: "Support" },
          unionPresetId: "opseu",
          primaryColor: "#F5D782",
          secondaryColor: "#FFFFFF",
          accentColor: "#5B4220",
          useOfficialLogo: false,
          logoText: "110",
          designTreatment: "paper",
          updatedAt: "2026-09-25T00:00:00.000Z",
        }),
      );
    });
    await page.reload();
    const light = await new AxeBuilder({ page })
      .include('[role="radiogroup"][aria-label="Design treatment"]')
      .withRules(["color-contrast"])
      .analyze();
    expect(seriousOrCriticalViolations(light.violations)).toEqual([]);
  });
});
