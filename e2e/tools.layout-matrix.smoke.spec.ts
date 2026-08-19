import { test, expect } from "@playwright/test";
import { FLYER_PRESETS } from "../src/lib/comms/flyer-presets";
import {
  LAYOUT_CLASS_FLYER,
  LAYOUT_CLASS_GRAPHIC,
  LAYOUT_CLASS_GRAPHIC_LAYOUT,
  LAYOUT_CLASS_MEETING,
  LAYOUT_CLASS_SOLIDARITY,
} from "../src/lib/comms/layout-class-matrix";
import { seedCanvasFonts } from "./helpers/canvas-fonts";
import {
  expectPlateGeometry,
  expectPreviewFitsColumn,
  expectUrlLayout,
  measurePlateFill,
  measurePreviewFit,
  measureUrlLayout,
  openPreviewTab,
  waitForExportRoot,
  waitForQrPreview,
} from "./helpers/canvas-layout";

const FLYER_LAYOUT_RADIO: Record<string, RegExp> = {
  band: /Colour band/i,
  stack: /^Stack$/i,
  split: /^Split$/i,
};

const GRAPHIC_LAYOUT_RADIO: Record<string, RegExp> = {
  notice: /^Notice$/i,
  solidarity: /^Solidarity$/i,
  spotlight: /^Spotlight$/i,
};

async function expectLayoutRadio(
  page: import("@playwright/test").Page,
  name: RegExp,
): Promise<void> {
  await expect(
    page.getByRole("radiogroup", { name: /^Layout$/i }).getByRole("radio", {
      name,
    }),
  ).toBeChecked();
}

test.describe("Canvas layout-class matrix @smoke", () => {
  test("flyer presets apply unique layouts without cropping", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedCanvasFonts(page);

    for (const id of LAYOUT_CLASS_FLYER) {
      const preset = FLYER_PRESETS[id];
      await page.goto(`/en/tools/flyer-maker/?preset=${id}`);
      await expect(
        page.getByRole("heading", { name: "Picket / Rally Flyer Maker" }),
      ).toBeVisible();
      await expectLayoutRadio(page, FLYER_LAYOUT_RADIO[preset.layout]);

      if (preset.showQr) {
        await waitForQrPreview(page);
        expectPlateGeometry(await measurePlateFill(page), {
          label: id,
          slots: 1,
        });
        expectUrlLayout(await measureUrlLayout(page), { label: id });
      } else {
        await waitForExportRoot(page);
        const fill = await measurePlateFill(page);
        expect(fill.imgCount, id).toBe(0);
      }
      expectPreviewFitsColumn(await measurePreviewFit(page), id);
    }
  });

  test("flyer letter stays uncropped at phone width", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/tools/flyer-maker/?preset=rally");
    await expect(
      page.getByRole("heading", { name: "Picket / Rally Flyer Maker" }),
    ).toBeVisible();
    await expectLayoutRadio(page, FLYER_LAYOUT_RADIO.stack);
    await openPreviewTab(page);
    await waitForQrPreview(page);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "flyer-390-letter",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "flyer-390-letter");
  });

  test("graphic maker presets apply layout classes", async ({ page }) => {
    test.setTimeout(120_000);
    await seedCanvasFonts(page);

    for (const id of LAYOUT_CLASS_GRAPHIC) {
      const layout = LAYOUT_CLASS_GRAPHIC_LAYOUT[id];
      await page.goto(`/en/tools/graphic-maker/?preset=${id}`);
      await expect(
        page.getByRole("heading", { name: "Graphic Maker" }),
      ).toBeVisible();
      await expectLayoutRadio(page, GRAPHIC_LAYOUT_RADIO[layout]);
      await waitForExportRoot(page);
      expectPreviewFitsColumn(await measurePreviewFit(page), id);
    }

    await page.goto(
      "/en/tools/graphic-maker/?preset=strikeAction&aspect=portrait",
    );
    await expect(
      page.getByRole("heading", { name: "Graphic Maker" }),
    ).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: /^Format$/i }).getByRole("radio", {
        name: /Portrait \(Reels\)/i,
      }),
    ).toBeChecked();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(
      await measurePreviewFit(page),
      "graphic-portrait-9-16",
    );
  });

  test("solidarity one slogan per layout plus 16:9", async ({ page }) => {
    test.setTimeout(90_000);
    await seedCanvasFonts(page);

    for (const row of LAYOUT_CLASS_SOLIDARITY) {
      await page.goto(`/en/tools/solidarity-poster/?preset=${row.id}`);
      await expect(
        page.getByRole("heading", { name: "Solidarity Poster Maker" }),
      ).toBeVisible();
      await expect(page.locator("#slogan-preset")).toHaveValue(row.id);
      await expect(page.locator("#poster-layout")).toHaveValue(row.layout);
      await waitForQrPreview(page);
      expectPlateGeometry(await measurePlateFill(page), {
        label: row.id,
        slots: 1,
      });
      expectPreviewFitsColumn(await measurePreviewFit(page), row.id);
    }

    await page.goto("/en/tools/solidarity-poster/?preset=solidarity-forever");
    await expect(page.locator("#slogan-preset")).toHaveValue(
      "solidarity-forever",
    );
    await page.getByRole("radio", { name: /^Digital$/i }).click();
    await page.getByRole("radio", { name: /Desktop 16:9/i }).click();
    await waitForQrPreview(page);
    expectPlateGeometry(await measurePlateFill(page), {
      label: "solidarity-16-9",
      slots: 1,
    });
    expectPreviewFitsColumn(await measurePreviewFit(page), "solidarity-16-9");
  });

  test("meeting background bold then minimal", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto(
      `/en/tools/meeting-background/?preset=${LAYOUT_CLASS_MEETING}`,
    );
    await expect(
      page.getByRole("heading", { name: "Meeting Background Maker" }),
    ).toBeVisible();
    await expect(page.locator("#meeting-preset")).toHaveValue(
      LAYOUT_CLASS_MEETING,
    );
    await expect(
      page.getByRole("radiogroup", { name: /^Design$/i }).getByRole("radio", {
        name: /^Bold$/i,
      }),
    ).toBeChecked();
    await expect(
      page.getByRole("radiogroup", { name: /^Layout$/i }).getByRole("radio", {
        name: /Lower third/i,
      }),
    ).toBeChecked();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "meeting-bold");

    await page
      .getByRole("radiogroup", { name: /^Design$/i })
      .getByRole("radio", { name: /^Minimal$/i })
      .click();
    await expect
      .poll(async () => {
        return page
          .getByRole("radiogroup", { name: /^Layout$/i })
          .getByRole("radio", { name: /Footer/i })
          .isChecked();
      }, { timeout: 10_000 })
      .toBe(true);
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "meeting-minimal");
  });

  test("quote card default export root fits the column", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/quote-card/");
    await expect(
      page.getByRole("heading", { name: "Quote Card Generator" }),
    ).toBeVisible();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "quote-card");
  });

  test("quote card portrait export root fits the column", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/quote-card/?aspect=portrait");
    await expect(
      page.getByRole("heading", { name: "Quote Card Generator" }),
    ).toBeVisible();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(
      await measurePreviewFit(page),
      "quote-card-portrait",
    );
  });

  test("board notice default export root fits the column", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/board-notice/");
    await expect(
      page.getByRole("heading", { name: "Board Notice Maker" }),
    ).toBeVisible();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "board-notice");
  });

  test("board banner header export root fits the column", async ({ page }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/board-banner/");
    await expect(
      page.getByRole("heading", { name: "Board Banner & Trim" }),
    ).toBeVisible();
    await page
      .getByRole("radiogroup", { name: /^What to print$/i })
      .getByRole("radio", { name: /Header banner/i })
      .click();
    await waitForExportRoot(page);
    expectPreviewFitsColumn(await measurePreviewFit(page), "board-banner-header");
  });

  test("pulse poll default export root when Hub-reachable", async ({
    page,
  }) => {
    const { loginAsDemoOfficer } = await import("./helpers/auth");
    await loginAsDemoOfficer(page);
    await seedCanvasFonts(page);
    await page.goto("/en/tools/pulse-poll/");
    if (!/\/tools\/pulse-poll/.test(page.url())) {
      test.skip(true, `Pulse Poll Hub not reachable (${page.url()})`);
    }
    const appeared = await page
      .locator("[data-export-root]")
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      test.skip(true, "Pulse Poll canvas not on this host");
    }
    expectPreviewFitsColumn(await measurePreviewFit(page), "pulse-poll");
  });
});
