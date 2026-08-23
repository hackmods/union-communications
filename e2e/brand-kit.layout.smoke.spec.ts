import { test, expect, type Page } from "@playwright/test";
import {
  assertFitsViewport,
  assertNoHorizontalOverflow,
} from "./helpers/layout";

const CAAT_S_LOOK_COPY =
  /Coral and gold bilingual College Support lockup preferred by many CAAT-S locals/;

const DESKTOP_VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const;

async function selectOpseuCaatSLook(page: Page) {
  // Brand Kit labels the control "Union preset"; onboarding uses "Union".
  await page.getByLabel(/^Union preset$|^Union$/).selectOption("opseu");
  await expect(page.getByLabel("OPSEU / SEFPO sector")).toBeVisible();
  await page.getByLabel("OPSEU / SEFPO sector").selectOption("caat-support");
  const gallery = page.getByTestId("identity-pack-gallery");
  await expect(gallery).toBeVisible();
  await gallery
    .getByRole("radio", { name: /College Support \(CAAT-S\)/i })
    .click();
  await expect(
    gallery.getByRole("radio", { name: /College Support \(CAAT-S\)/i }),
  ).toBeChecked();
}

async function assertCaatSLookFits(page: Page) {
  await assertNoHorizontalOverflow(page);
  const gallery = page.getByTestId("identity-pack-gallery");
  await expect(gallery).toBeVisible();
  await assertFitsViewport(page, gallery);

  const description = page.getByText(CAAT_S_LOOK_COPY);
  await expect(description).toBeVisible();
  await assertFitsViewport(page, description);

  const card = gallery.getByRole("radio", {
    name: /College Support \(CAAT-S\)/i,
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

  test("onboarding Look gallery stays inside the page at tablet and desktop widths", async ({
    page,
  }) => {
    await page.goto("/en/onboarding/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await selectOpseuCaatSLook(page);

    for (const size of DESKTOP_VIEWPORTS) {
      await page.setViewportSize(size);
      await assertCaatSLookFits(page);
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

  test("onboarding Look gallery stays inside a phone viewport", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "chromium-mobile project only",
    );
    await page.goto("/en/onboarding/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await selectOpseuCaatSLook(page);
    await assertCaatSLookFits(page);
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
    await page.getByLabel(/^Union preset$|^Union$/).selectOption("opseu");
    await expect(page.getByLabel("OPSEU / SEFPO sector")).toBeVisible();

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
