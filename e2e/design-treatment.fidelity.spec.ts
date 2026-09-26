import { expect, test } from "@playwright/test";
import { DEFAULT_BRAND_KIT } from "../src/lib/constants/brand";
import {
  assertRasterMatch, bridgeCapturePng, decodePngFile, downloadNamed,
  previewPaintPng, rasterizePdfPage, waitForExportRoot,
} from "./helpers/export-fidelity";

const treatments = [
  { label: "Full colour", value: "full" },
  { label: "Balanced", value: "balanced" },
  { label: "Mostly white", value: "paper" },
] as const;

function nearWhiteShare(raster: { data: Uint8Array; width: number; height: number }) {
  let count = 0;
  const pixels = raster.width * raster.height;
  for (let i = 0; i < raster.data.length; i += 4) {
    if (raster.data[i] > 245 && raster.data[i + 1] > 245 && raster.data[i + 2] > 245 && raster.data[i + 3] > 245) count++;
  }
  return count / pixels;
}

test.describe("Design treatment export matrix @export", () => {
  test.describe.configure({ timeout: 180_000 });
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  const cases = [
    { name: "coral-flyer", route: "/en/tools/flyer-maker/", colors: ["#D65B60", "#FFFFFF", "#823038"] },
    { name: "dark-graphic", route: "/en/tools/graphic-maker/", colors: ["#142746", "#FFFFFF", "#30A5B5"] },
    { name: "light-board", route: "/en/tools/board-notice/", colors: ["#F5D782", "#FFFFFF", "#5B4220"] },
    { name: "coral-wallet", route: "/en/tools/qr-card/", colors: ["#D65B60", "#FFFFFF", "#823038"] },
  ] as const;

  for (const c of cases) {
    test(`${c.name} preview, PNG, and treatment state`, async ({ page }) => {
      const kit = { ...DEFAULT_BRAND_KIT, primaryColor: c.colors[0], secondaryColor: c.colors[1], accentColor: c.colors[2] };
      await page.addInitScript((storedKit) => {
        localStorage.setItem("unionops-brand-kit", JSON.stringify(storedKit));
      }, kit);
      await page.goto(c.route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await waitForExportRoot(page);
      const whiteShares: number[] = [];
      for (const treatment of treatments) {
        await page.getByRole("radio", { name: treatment.label }).click();
        await expect(page.getByRole("radio", { name: treatment.label })).toHaveAttribute("aria-checked", "true");
        await page.waitForTimeout(150);
        const capture = await bridgeCapturePng(page, { pixelRatio: 2 });
        whiteShares.push(nearWhiteShare(capture));
        const preview = await previewPaintPng(page);
        assertRasterMatch(capture, preview, { threshold: 40, maxDiffRatio: c.name === "dark-graphic" ? 0.14 : 0.11 }, `${c.name} ${treatment.value} preview`);
        const file = await downloadNamed(page, /Download PNG|PNG/i, `${c.name}-${treatment.value}.png`);
        const png = decodePngFile(file);
        assertRasterMatch(capture, png, { threshold: 20, maxDiffRatio: c.name === "dark-graphic" ? 0.06 : 0.04 }, `${c.name} ${treatment.value} PNG`);
        if (c.name === "coral-flyer") {
          const pdfFile = await downloadNamed(page, /Download PDF|PDF/i, `${c.name}-${treatment.value}.pdf`);
          const pdf = await rasterizePdfPage(pdfFile, 1.25);
          assertRasterMatch(capture, pdf, { threshold: 48, maxDiffRatio: 0.13 }, `${c.name} ${treatment.value} PDF`);
        }
      }
      if (c.name === "coral-flyer") {
        expect(whiteShares[1]).toBeGreaterThan(whiteShares[0] + 0.08);
        expect(whiteShares[2]).toBeGreaterThan(whiteShares[1] + 0.01);
      }
    });
  }
});
