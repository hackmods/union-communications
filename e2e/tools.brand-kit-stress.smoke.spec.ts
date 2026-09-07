import { test, expect } from "@playwright/test";
import { seedCanvasFonts } from "./helpers/canvas-fonts";
import {
  expectLeadReadable,
  expectMetaSupport,
  expectPreviewFitsColumn,
  measureLeadReadable,
  measureMetaSupport,
  measurePreviewFit,
  waitForExportRoot,
  waitForQrPreview,
} from "./helpers/canvas-layout";

/**
 * Within-reason Brand Kit stress: tight density + wide official lockup on the
 * three print/poster surfaces that already have meta-pack guards.
 */
test.describe("Brand Kit canvas stress @smoke", () => {
  test("tight density keeps meta supporting on flyer, notice, solidarity", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedCanvasFonts(page, {
      density: "tight",
      subText: "College Faculty Full-Time",
    });

    await page.goto("/en/tools/flyer-maker/?preset=picket");
    await waitForExportRoot(page);
    expectMetaSupport(await measureMetaSupport(page), "tight-flyer");
    expectPreviewFitsColumn(await measurePreviewFit(page), "tight-flyer");

    await page.goto("/en/tools/board-notice/");
    await waitForExportRoot(page);
    expectMetaSupport(await measureMetaSupport(page), "tight-notice");

    await page.goto("/en/tools/solidarity-poster/?preset=solidarity-forever");
    await waitForQrPreview(page);
    expectMetaSupport(await measureMetaSupport(page), "tight-solidarity");
    expectLeadReadable(
      await measureLeadReadable(page),
      "tight-solidarity-lead",
    );
  });

  test("wide official lockup keeps lead and meta readable", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedCanvasFonts(page, {
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      subText: "College Faculty Full-Time",
      primaryColor: "#003DA5",
    });

    await page.goto("/en/tools/solidarity-poster/?preset=solidarity-forever");
    await expect(
      page.getByRole("heading", { name: "Solidarity Poster Maker" }),
    ).toBeVisible();
    await waitForQrPreview(page);
    expectLeadReadable(
      await measureLeadReadable(page),
      "lockup-solidarity-lead",
    );
    expectMetaSupport(await measureMetaSupport(page), "lockup-solidarity-meta");

    await page.goto("/en/tools/board-notice/");
    await waitForExportRoot(page);
    const root = page.locator("[data-export-root]");
    await expect(root.getByText(/GENERAL MEMBERSHIP MEETING/i)).toBeVisible();
    expectMetaSupport(await measureMetaSupport(page), "lockup-notice-meta");
  });
});
