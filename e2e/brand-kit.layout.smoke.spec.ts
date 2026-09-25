import { test, expect, type Page } from "@playwright/test";
import {
  assertFitsViewport,
  assertNoHorizontalOverflow,
} from "./helpers/layout";
import { expectNoSeriousA11yViolations } from "./helpers/axe";

const CAAT_S_CORAL_COPY =
  /Coral campaign field with the white-and-gold College Support lockup/;

const DESKTOP_VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const;

const CAAT_A_BURGUNDY_COPY =
  /Burgundy campaign field with the white College Faculty lockup/;

test.describe("Brand Kit workspace @smoke", () => {
  test("puts local identity and the live preview in the first desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/create/brand-kit/");

    const localNumber = page.getByRole("textbox", { name: "Local number" });
    const preview = page.getByTestId("brand-kit-preview");
    await expect(localNumber).toBeVisible();
    await expect(preview).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const inputBox = await localNumber.boundingBox();
    const previewBox = await preview.boundingBox();
    expect(inputBox).toBeTruthy();
    expect(previewBox).toBeTruthy();
    expect(inputBox!.y + inputBox!.height).toBeLessThan(900);
    expect(previewBox!.y + 100).toBeLessThan(900);
    expect(previewBox!.x).toBeGreaterThan(inputBox!.x + inputBox!.width);

    const before = await preview.getAttribute("style");
    await page.getByRole("radio", { name: "Field", exact: true }).click();
    await expect(preview).not.toHaveAttribute("style", before ?? "");
  });

  test("keeps reset behind confirmation", async ({ page }) => {
    await page.goto("/en/create/brand-kit/");
    const localNumber = page.getByRole("textbox", { name: "Local number" });
    await localNumber.fill("404");
    await expect(localNumber).toHaveValue("404");

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(localNumber).toHaveValue("404");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(localNumber).toHaveValue("");
  });

  test("saves a local identity and points transfers to Local pack", async ({ page, browser }) => {
    await page.goto("/en/create/brand-kit/");
    const localNumber = page.getByRole("textbox", { name: "Local number" });
    await localNumber.fill("404");
    await expect(page.getByRole("status").getByText("Changes saved successfully"))
      .toBeVisible();
    await page.reload();
    await expect(localNumber).toHaveValue("404");
    await expect(page.getByText("Saved in this browser")).toBeVisible();
    await expect(page.getByRole("link", { name: "Move to another browser" }))
      .toHaveAttribute("href", "/en/utilities/local-pack/");

    const freshContext = await browser.newContext();
    try {
      const freshPage = await freshContext.newPage();
      await freshPage.goto("/en/create/brand-kit/");
      await expect(freshPage.getByRole("textbox", { name: "Local number" }))
        .toHaveValue("");
    } finally {
      await freshContext.close();
    }
  });

  test("keeps French controls and preview usable at enlarged layout widths", async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 720, height: 900 });
    await page.goto("/fr/create/brand-kit/");

    const localNumber = page.getByRole("textbox", { name: "Numéro de section", exact: true });
    await expect(localNumber).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const previewJump = page.getByRole("link", { name: "Aperçu", exact: true });
    await previewJump.focus();
    await expect(previewJump).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#brand-preview$/);
    await expect(page.getByTestId("brand-kit-preview")).toBeVisible();
    await expectNoSeriousA11yViolations(page);

    await page.setViewportSize({ width: 320, height: 700 });
    await assertNoHorizontalOverflow(page);
    await expect(localNumber).toBeVisible();
  });
});

async function selectOpseuCaatALook(page: Page) {
  const unionSelect = page.getByLabel(/^Union preset$|^Union$/);
  await expect(unionSelect).toBeVisible();
  await expect(async () => {
    if ((await unionSelect.inputValue()) !== "opseu") {
      await unionSelect.selectOption("opseu");
    }
    await expect(page.getByLabel("OPSEU / SEFPO sector")).toBeVisible();
  }).toPass({ timeout: 15_000 });
  await page.getByLabel("OPSEU / SEFPO sector").selectOption("caat-academic");
  const gallery = page.getByTestId("identity-pack-gallery");
  await expect(gallery).toBeVisible();
  await gallery
    .getByRole("radio", { name: /College Faculty — burgundy/i })
    .click();
  await expect(
    gallery.getByRole("radio", { name: /College Faculty — burgundy/i }),
  ).toBeChecked();
  await expect(
    gallery.getByRole("radio", { name: /College Faculty — coalition blue/i }),
  ).toBeVisible();
}

async function assertCaatALookFits(page: Page) {
  await assertNoHorizontalOverflow(page);
  const gallery = page.getByTestId("identity-pack-gallery");
  await expect(gallery).toBeVisible();
  await assertFitsViewport(page, gallery);

  const description = page.getByText(CAAT_A_BURGUNDY_COPY);
  await expect(description).toBeVisible();
  await assertFitsViewport(page, description);

  const card = gallery.getByRole("radio", {
    name: /College Faculty — burgundy/i,
  });
  await expect(card).toBeVisible();
  await assertFitsViewport(page, card);
}

async function selectOpseuCaatSLook(page: Page) {
  // Brand Kit labels the control "Union preset"; onboarding uses "Union".
  const unionSelect = page.getByLabel(/^Union preset$|^Union$/);
  await expect(unionSelect).toBeVisible();
  // Preset changes queue until the brand store hydrates from localStorage.
  await expect(async () => {
    if ((await unionSelect.inputValue()) !== "opseu") {
      await unionSelect.selectOption("opseu");
    }
    await expect(page.getByLabel("OPSEU / SEFPO sector")).toBeVisible();
  }).toPass({ timeout: 15_000 });
  await page.getByLabel("OPSEU / SEFPO sector").selectOption("caat-support");
  const gallery = page.getByTestId("identity-pack-gallery");
  await expect(gallery).toBeVisible();
  await gallery
    .getByRole("radio", { name: /College Support — coral/i })
    .click();
  await expect(
    gallery.getByRole("radio", { name: /College Support — coral/i }),
  ).toBeChecked();
  await expect(
    gallery.getByRole("radio", { name: /College Support — gold/i }),
  ).toBeVisible();
}

async function assertCaatSLookFits(page: Page) {
  await assertNoHorizontalOverflow(page);
  const gallery = page.getByTestId("identity-pack-gallery");
  await expect(gallery).toBeVisible();
  await assertFitsViewport(page, gallery);

  const description = page.getByText(CAAT_S_CORAL_COPY);
  await expect(description).toBeVisible();
  await assertFitsViewport(page, description);

  const card = gallery.getByRole("radio", {
    name: /College Support — coral/i,
  });
  await expect(card).toBeVisible();
  await assertFitsViewport(page, card);
}

test.describe("Brand Kit layout — OPSEU CAAT-S Look @smoke", () => {
  test("Look gallery stays inside the page at tablet and desktop widths", async ({
    page,
  }) => {
    await page.goto("/en/brand-kit/");
    await expect(
      page.getByRole("heading", { name: /Brand Kit|Trousse/i }),
    ).toBeVisible();
    await selectOpseuCaatSLook(page);

    for (const size of DESKTOP_VIEWPORTS) {
      await page.setViewportSize(size);
      await assertCaatSLookFits(page);
    }
  });

  test("onboarding recommends the canonical Brand Kit before the first communications task", async ({
    page,
  }) => {
    await page.goto("/en/onboarding/");
    await expect(page).toHaveURL(/\/en\/start\/?\?step=brand/);
    const brandKitLink = page.locator('a[href="/en/create/brand-kit/"]').first();
    await expect(brandKitLink).toHaveAttribute("href", "/en/create/brand-kit/");
    await brandKitLink.click();
    await expect(page).toHaveURL(/\/en\/create\/brand-kit\//);
  });
});

test.describe("Brand Kit layout — OPSEU CAAT-A Look @smoke", () => {
  test("Look gallery stays inside the page at tablet and desktop widths", async ({
    page,
  }) => {
    await page.goto("/en/brand-kit/");
    await expect(
      page.getByRole("heading", { name: /Brand Kit|Trousse/i }),
    ).toBeVisible();
    await selectOpseuCaatALook(page);

    for (const size of DESKTOP_VIEWPORTS) {
      await page.setViewportSize(size);
      await assertCaatALookFits(page);
    }
  });
});

test.describe("Brand Kit layout — OPSEU CAAT-S Look @smoke @mobile", () => {
  test("Look gallery and coral lockup stay inside a phone viewport", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "chromium-mobile project only",
    );
    await page.goto("/en/brand-kit/");
    await expect(
      page.getByRole("heading", { name: /Brand Kit|Trousse/i }),
    ).toBeVisible();
    await selectOpseuCaatSLook(page);
    await assertCaatSLookFits(page);
  });

  test("legacy onboarding route directs new members to Brand Kit setup", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "chromium-mobile project only",
    );
    await page.goto("/en/onboarding/");
    await expect(page).toHaveURL(/\/en\/start\/?\?step=brand$/);
    await expect(
      page.getByRole("heading", { name: "Choose a role to see the steps" }),
    ).toBeVisible();
    const brandKitLink = page.getByRole("main").getByRole("link", { name: "Brand Kit" });
    await expect(brandKitLink).toHaveAttribute("href", /\/en\/create\/brand-kit\/?$/);
    await assertNoHorizontalOverflow(page);
  });
});

test.describe("Brand Kit membership audience @smoke", () => {
  test("hides Full-time / Part-time unless the sector is College Support", async ({
    page,
  }) => {
    await page.goto("/en/brand-kit/");
    await expect(
      page.getByRole("heading", { name: /Brand Kit|Trousse/i }),
    ).toBeVisible();
    await expect(async () => {
      if ((await page.getByLabel(/^Union preset$|^Union$/).inputValue()) !== "opseu") {
        await page.getByLabel(/^Union preset$|^Union$/).selectOption("opseu");
      }
      await expect(page.getByLabel("OPSEU / SEFPO sector")).toBeVisible();
    }).toPass({ timeout: 15_000 });

    await page.getByLabel("OPSEU / SEFPO sector").selectOption("ops");
    await expect(
      page.getByRole("heading", { name: "Membership application links" }),
    ).toBeVisible();
    await expect(page.getByLabel("Audience")).toHaveCount(0);

    await page.getByLabel("OPSEU / SEFPO sector").selectOption("caat-support");
    const audience = page.getByLabel("Audience").first();
    await expect(audience).toBeVisible();
    await expect(audience).toContainText("Full-time");
    await expect(audience).toContainText("Part-time");
  });
});
