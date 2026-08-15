import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  assertCanvasFontCssVars,
  awaitDocumentFonts,
  brandKitPreviewHeadlineFontFamily,
  exportRootHeadlineFontFamily,
  looksLikeWebfontFamily,
  seedCanvasFonts,
} from "./helpers/canvas-fonts";
import {
  assertRasterMatch,
  bridgeCapturePng,
  downloadNamed,
  ensureOutDir,
  waitForExportRoot,
} from "./helpers/export-fidelity";
import {
  assertCaptureHasBrandAndInk,
  sampleImageData,
} from "../src/lib/export/fidelity";
import { EXPORT_ROOT_SELECTOR } from "../src/lib/export/export-root";

/**
 * Canvas brand fonts — rendering + export coverage.
 * Complements tools.export.smoke (default kit) with explicit typeface checks.
 */

async function sampleDownloadedPng(
  page: import("@playwright/test").Page,
  filePath: string,
) {
  const buf = fs.readFileSync(filePath);
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return page.evaluate(async (url) => {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("png load failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return {
      data: Array.from(data),
      width,
      height,
    };
  }, dataUrl);
}

test.describe("Canvas brand fonts rendering @smoke", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("locale shell registers OFL canvas font CSS variables", async ({
    page,
  }) => {
    await page.goto("/en/brand-kit/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await awaitDocumentFonts(page);
    await assertCanvasFontCssVars(page);
  });

  test("Brand Kit headline picker applies Oswald to canvas specimen", async ({
    page,
  }) => {
    await page.goto("/en/brand-kit/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await awaitDocumentFonts(page);

    const headlineGroup = page.getByRole("radiogroup", {
      name: /Headline font/i,
    });
    await expect(headlineGroup).toBeVisible();
    await headlineGroup.getByRole("radio", { name: "Oswald" }).click();
    await page.waitForTimeout(200);
    await awaitDocumentFonts(page);

    const family = await brandKitPreviewHeadlineFontFamily(page);
    expect(
      looksLikeWebfontFamily(family),
      `expected webfont family, got: ${family}`,
    ).toBe(true);
    expect(family.toLowerCase()).toMatch(/oswald|__/i);
  });

  test("default Flyer export root uses Brand Kit webfont headline", async ({
    page,
  }) => {
    await seedCanvasFonts(page, {
      headlineFontId: "montserrat",
      bodyFontId: "sourceSans",
    });
    await page.goto("/en/tools/flyer-maker/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await waitForExportRoot(page);

    const family = await exportRootHeadlineFontFamily(page);
    expect(
      looksLikeWebfontFamily(family),
      `expected Montserrat-like webfont, got: ${family}`,
    ).toBe(true);
  });

  test("Flyer headline override to Oswald updates capture root", async ({
    page,
  }) => {
    await seedCanvasFonts(page, {
      headlineFontId: "montserrat",
      bodyFontId: "sourceSans",
    });
    await page.goto("/en/tools/flyer-maker/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const typography = page.getByText("Typography", { exact: false }).first();
    // ToolFormDetails often uses <details> — open if needed
    const details = page.locator("details").filter({ hasText: /Typography/i });
    if ((await details.count()) > 0) {
      await details.first().locator("summary").click();
    } else {
      await typography.click().catch(() => undefined);
    }

    const fontGroup = page.getByRole("radiogroup", {
      name: /Headline font/i,
    });
    await expect(fontGroup).toBeVisible();
    await fontGroup.getByRole("radio", { name: "Oswald" }).click();
    await waitForExportRoot(page);

    const family = await exportRootHeadlineFontFamily(page);
    expect(family.toLowerCase()).toMatch(/oswald|__/i);
  });

  test("Graphic Maker with Barlow Condensed still exports branded PNG", async ({
    page,
  }) => {
    await seedCanvasFonts(page, {
      headlineFontId: "barlowCondensed",
      bodyFontId: "sourceSans",
      primaryColor: "#003DA5",
    });
    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("heading", { name: /Graphic Maker/i }),
    ).toBeVisible();
    await waitForExportRoot(page);

    const family = await exportRootHeadlineFontFamily(page);
    expect(
      looksLikeWebfontFamily(family) || /barlow|__/i.test(family),
      `expected Barlow/webfont, got: ${family}`,
    ).toBe(true);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG" }).click();
    const download = await downloadPromise;
    const outDir = path.join("test-results", "tool-fonts-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `barlow-${download.suggestedFilename()}`);
    await download.saveAs(filePath);
    expect(fs.statSync(filePath).size).toBeGreaterThan(5_000);

    const raw = await sampleDownloadedPng(page, filePath);
    const sample = sampleImageData(
      Uint8ClampedArray.from(raw.data),
      raw.width,
      raw.height,
      { step: 8 },
    );
    const check = assertCaptureHasBrandAndInk(sample, {
      minField: 40,
      minInk: 10,
    });
    expect(check.ok, check.reason).toBe(true);
  });

  test("Board Notice with Source Serif exports PDF with page art", async ({
    page,
  }) => {
    await seedCanvasFonts(page, {
      headlineFontId: "sourceSerif",
      bodyFontId: "sourceSans",
    });
    await page.goto("/en/tools/board-notice/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await waitForExportRoot(page);

    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /Download PDF|PDF/i })
      .first()
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const outDir = path.join("test-results", "tool-fonts-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, download.suggestedFilename());
    await download.saveAs(filePath);
    expect(fs.statSync(filePath).size).toBeGreaterThan(15_000);

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjs.getDocument({ data }).promise;
    expect(doc.numPages).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Canvas brand fonts export fidelity @export", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("Flyer Montserrat vs Oswald captures differ (fonts paint)", async ({
    page,
  }) => {
    ensureOutDir();

    await seedCanvasFonts(page, { headlineFontId: "montserrat" });
    await page.goto("/en/tools/flyer-maker/");
    await waitForExportRoot(page);
    const montserrat = await bridgeCapturePng(page, { pixelRatio: 2 });

    // Re-seed Oswald in a fresh navigation (init script only runs once per context)
    await page.context().clearCookies();
    const page2 = await page.context().newPage();
    await page2.setViewportSize({ width: 1280, height: 900 });
    await seedCanvasFonts(page2, { headlineFontId: "oswald" });
    await page2.goto("/en/tools/flyer-maker/");
    await waitForExportRoot(page2);
    const oswald = await bridgeCapturePng(page2, { pixelRatio: 2 });
    await page2.close();

    expect(montserrat.width).toBe(oswald.width);
    expect(montserrat.height).toBe(oswald.height);

    // Must differ — proves typefaces are not collapsing to one fallback
    let differ = false;
    try {
      assertRasterMatch(
        montserrat,
        oswald,
        { maxDiffRatio: 0.002 },
        "montserrat-vs-oswald",
      );
    } catch {
      differ = true;
    }
    expect(
      differ,
      "Montserrat and Oswald Flyer captures should differ when fonts load",
    ).toBe(true);
  });

  test("Flyer inherit Brand Kit Roboto Slab PNG matches capture", async ({
    page,
  }) => {
    await seedCanvasFonts(page, {
      headlineFontId: "robotoSlab",
      bodyFontId: "sourceSans",
    });
    await page.goto("/en/tools/flyer-maker/");
    await waitForExportRoot(page);

    const capture = await bridgeCapturePng(page, { pixelRatio: 2 });
    const filePath = await downloadNamed(
      page,
      /Download PNG/i,
      "flyer-slab.png",
    );
    const { decodePngFile } = await import("./helpers/export-fidelity");
    const downloaded = decodePngFile(filePath);
    assertRasterMatch(
      capture,
      downloaded,
      { maxDiffRatio: 0.04 },
      "flyer-slab-capture-download",
    );
  });

  test("Meeting Background Oswald headline capture stays non-empty", async ({
    page,
  }) => {
    await seedCanvasFonts(page, {
      headlineFontId: "oswald",
      bodyFontId: "sourceSans",
    });
    await page.goto("/en/tools/meeting-background/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await waitForExportRoot(page);

    const hasLines = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      return Boolean(root?.querySelector("[data-headline-line]"));
    }, EXPORT_ROOT_SELECTOR);
    expect(hasLines).toBe(true);

    const family = await page.evaluate((sel) => {
      const line = document
        .querySelector(sel)
        ?.querySelector("[data-headline-line]");
      if (!line) throw new Error("no headline line");
      return getComputedStyle(line).fontFamily;
    }, EXPORT_ROOT_SELECTOR);
    expect(family.toLowerCase()).toMatch(/oswald|__/i);

    const capture = await bridgeCapturePng(page, { pixelRatio: 2 });
    expect(capture.width * capture.height).toBeGreaterThan(10_000);
  });
});
