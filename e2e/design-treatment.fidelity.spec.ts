import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_BRAND_KIT } from "../src/lib/constants/brand";
import {
  assertRasterMatch,
  bridgeCapturePng,
  decodePngFile,
  downloadNamed,
  previewPaintPng,
  rasterizePdfPage,
  waitForExportRoot,
  writeSampleUploadPng,
} from "./helpers/export-fidelity";

const treatmentsEn = [
  { label: "Full colour", value: "full" },
  { label: "Balanced", value: "balanced" },
  { label: "Mostly white", value: "paper" },
] as const;

const treatmentsFr = [
  { label: "Couleur pleine", value: "full" },
  { label: "Équilibrée", value: "balanced" },
  { label: "Surtout blanche", value: "paper" },
] as const;

type TreatmentOption = (typeof treatmentsEn)[number] | (typeof treatmentsFr)[number];

const LONG_FR =
  "Assemblée générale annuelle — veuillez confirmer votre présence avant le 12 septembre. " +
  "Apportez votre carte de membre. Accessibilité et garde d'enfants sur demande auprès du local. ".repeat(2);

function nearWhiteShare(raster: {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}) {
  let count = 0;
  const pixels = raster.width * raster.height;
  for (let i = 0; i < raster.data.length; i += 4) {
    if (
      raster.data[i] > 245 &&
      raster.data[i + 1] > 245 &&
      raster.data[i + 2] > 245 &&
      raster.data[i + 3] > 245
    ) {
      count++;
    }
  }
  return count / pixels;
}

async function seedKit(page: Page, colors: readonly [string, string, string]) {
  const kit = {
    ...DEFAULT_BRAND_KIT,
    primaryColor: colors[0],
    secondaryColor: colors[1],
    accentColor: colors[2],
  };
  await page.addInitScript((storedKit) => {
    localStorage.setItem("unionops-brand-kit", JSON.stringify(storedKit));
  }, kit);
}

async function cycleTreatments(
  page: Page,
  label: string,
  opts: {
    pdf?: boolean;
    previewMaxDiff?: number;
    pngMaxDiff?: number;
    treatments?: readonly TreatmentOption[];
  } = {},
) {
  const whiteShares: number[] = [];
  const options = opts.treatments ?? treatmentsEn;
  for (const treatment of options) {
    await page.getByRole("radio", { name: treatment.label }).click();
    await expect(page.getByRole("radio", { name: treatment.label })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.waitForTimeout(150);
    const capture = await bridgeCapturePng(page, { pixelRatio: 2 });
    whiteShares.push(nearWhiteShare(capture));
    const preview = await previewPaintPng(page);
    assertRasterMatch(
      capture,
      preview,
      { threshold: 40, maxDiffRatio: opts.previewMaxDiff ?? 0.11 },
      `${label} ${treatment.value} preview`,
    );
    const file = await downloadNamed(
      page,
      /Download PNG|Télécharger PNG|PNG/i,
      `${label}-${treatment.value}.png`,
    );
    const png = decodePngFile(file);
    assertRasterMatch(
      capture,
      png,
      { threshold: 20, maxDiffRatio: opts.pngMaxDiff ?? 0.04 },
      `${label} ${treatment.value} PNG`,
    );
    if (opts.pdf) {
      const pdfFile = await downloadNamed(
        page,
        /Download PDF|Télécharger PDF|PDF/i,
        `${label}-${treatment.value}.pdf`,
      );
      const pdf = await rasterizePdfPage(pdfFile, 1.25);
      assertRasterMatch(
        capture,
        pdf,
        { threshold: 48, maxDiffRatio: 0.13 },
        `${label} ${treatment.value} PDF`,
      );
    }
  }
  return whiteShares;
}

test.describe("Design treatment export matrix @export", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  const cases = [
    {
      name: "coral-flyer",
      route: "/en/tools/flyer-maker/",
      colors: ["#D65B60", "#FFFFFF", "#823038"] as const,
      pdf: true,
    },
    {
      name: "dark-graphic",
      route: "/en/tools/graphic-maker/",
      colors: ["#142746", "#FFFFFF", "#30A5B5"] as const,
      previewMaxDiff: 0.14,
      pngMaxDiff: 0.06,
    },
    {
      name: "light-board",
      route: "/en/tools/board-notice/",
      colors: ["#F5D782", "#FFFFFF", "#5B4220"] as const,
    },
    {
      name: "coral-wallet",
      route: "/en/tools/qr-card/",
      colors: ["#D65B60", "#FFFFFF", "#823038"] as const,
    },
  ] as const;

  for (const c of cases) {
    test(`${c.name} preview, PNG, and treatment state`, async ({ page }) => {
      await seedKit(page, c.colors);
      await page.goto(c.route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await waitForExportRoot(page);
      const whiteShares = await cycleTreatments(page, c.name, {
        pdf: "pdf" in c && c.pdf,
        previewMaxDiff: "previewMaxDiff" in c ? c.previewMaxDiff : undefined,
        pngMaxDiff: "pngMaxDiff" in c ? c.pngMaxDiff : undefined,
      });
      if (c.name === "coral-flyer") {
        expect(whiteShares[1]).toBeGreaterThan(whiteShares[0] + 0.08);
        expect(whiteShares[2]).toBeGreaterThan(whiteShares[1] + 0.01);
      }
    });
  }

  test("photo spotlight and long French flyer keep treatment fidelity", async ({
    page,
  }) => {
    await seedKit(page, ["#D65B60", "#FFFFFF", "#823038"]);
    await page.goto("/en/tools/graphic-maker/");
    await expect(page.getByRole("heading", { name: /Graphic Maker/i })).toBeVisible();
    await waitForExportRoot(page);

    const photoPath = path.join("test-results", "design-treatment-photo.png");
    writeSampleUploadPng(photoPath);
    await page.locator('input[type="file"]').setInputFiles(photoPath);
    await page
      .getByRole("button", { name: "I confirm consent has been obtained" })
      .click();
    await expect(page.getByRole("button", { name: /^Remove$/i })).toBeVisible();
    await cycleTreatments(page, "photo-spotlight", {
      previewMaxDiff: 0.14,
      pngMaxDiff: 0.06,
    });

    await page.goto("/fr/tools/flyer-maker/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByLabel("Détails complémentaires (facultatif)").fill(LONG_FR);
    await waitForExportRoot(page);
    const whiteShares = await cycleTreatments(page, "fr-long-flyer", {
      pdf: true,
      treatments: treatmentsFr,
    });
    expect(whiteShares[1]).toBeGreaterThan(whiteShares[0] + 0.05);
    expect(whiteShares[2]).toBeGreaterThan(whiteShares[1]);
  });
});
