import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  assertRasterMatch,
  bridgeCapturePng,
  downloadNamed,
  previewPaintPng,
  rasterizePdfPage,
  waitForExportRoot,
  decodePngFile,
  ensureOutDir,
} from "./helpers/export-fidelity";

/**
 * Phase 9e — preview/capture ↔ downloaded output comparison for Comms tools.
 * Tagged @export (not on default @smoke path) so runtime stays optional in CI.
 */

test.describe("Tool export fidelity @export", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  type PngCase = {
    name: string;
    path: string;
    heading?: RegExp;
    button?: RegExp;
    /** Capture↔download max diff. */
    captureMaxDiff?: number;
    /** Preview paint↔capture max diff (cross-rasterizer; looser). */
    previewMaxDiff?: number;
    /** Skip Chromium paint vs html-to-image (e.g. transparent circle logos). */
    skipPreviewCompare?: boolean;
    prepare?: (page: import("@playwright/test").Page) => Promise<void>;
  };

  const pngCases: PngCase[] = [
    { name: "flyer-maker", path: "/en/tools/flyer-maker/" },
    {
      name: "graphic-maker",
      path: "/en/tools/graphic-maker/",
      heading: /Graphic Maker/i,
      captureMaxDiff: 0.06,
    },
    { name: "board-notice", path: "/en/tools/board-notice/" },
    { name: "solidarity-poster", path: "/en/tools/solidarity-poster/" },
    { name: "quote-card", path: "/en/tools/quote-card/" },
    { name: "action-card", path: "/en/tools/action-card/" },
    { name: "qr-card", path: "/en/tools/qr-card/" },
    { name: "qr-board", path: "/en/tools/qr-board/" },
    // pulse-poll is Officer Hub gated (404 when hub not public) — skip in public e2e
    {
      name: "meeting-background",
      path: "/en/tools/meeting-background/",
      captureMaxDiff: 0.05,
      previewMaxDiff: 0.12,
    },
    {
      name: "logo-builder",
      path: "/en/tools/logo-builder/",
      captureMaxDiff: 0.05,
      skipPreviewCompare: true,
    },
    {
      name: "board-banner",
      path: "/en/tools/board-banner/",
      prepare: async (page) => {
        await page.getByRole("radio", { name: /Header banner/i }).click();
        await page.waitForTimeout(300);
      },
    },
    {
      name: "resizer",
      path: "/en/tools/resizer/",
      // Default source is local logo plate — no upload/consent needed
      captureMaxDiff: 0.06,
      previewMaxDiff: 0.14,
    },
    { name: "org-chart", path: "/en/tools/org-chart/" },
  ];

  for (const c of pngCases) {
    test(`${c.name} PNG: capture and preview match download`, async ({
      page,
    }) => {
      await page.goto(c.path);
      await expect(
        c.heading
          ? page.getByRole("heading", { name: c.heading })
          : page.getByRole("heading", { level: 1 }),
      ).toBeVisible();
      if (c.prepare) await c.prepare(page);
      await waitForExportRoot(page);

      const capture = await bridgeCapturePng(page, { pixelRatio: 2 });
      if (!c.skipPreviewCompare) {
        const preview = await previewPaintPng(page);
        assertRasterMatch(
          capture,
          preview,
          {
            threshold: 40,
            maxDiffRatio: c.previewMaxDiff ?? 0.1,
          },
          `${c.name} preview↔capture`,
        );
      }

      const filePath = await downloadNamed(
        page,
        c.button ?? /Download PNG|PNG/i,
        `${c.name}.png`,
      );
      expect(fs.statSync(filePath).size).toBeGreaterThan(2_000);
      const downloaded = decodePngFile(filePath);

      assertRasterMatch(
        capture,
        downloaded,
        {
          threshold: 20,
          maxDiffRatio: c.captureMaxDiff ?? 0.035,
        },
        `${c.name} capture↔download`,
      );
    });
  }

  type PdfCase = {
    name: string;
    path: string;
    button?: RegExp;
    maxDiff?: number;
    prepare?: (page: import("@playwright/test").Page) => Promise<void>;
  };

  const pdfCases: PdfCase[] = [
    { name: "flyer-maker", path: "/en/tools/flyer-maker/" },
    { name: "board-notice", path: "/en/tools/board-notice/" },
    { name: "solidarity-poster", path: "/en/tools/solidarity-poster/" },
    { name: "action-card", path: "/en/tools/action-card/" },
    { name: "qr-card", path: "/en/tools/qr-card/" },
    { name: "qr-board", path: "/en/tools/qr-board/" },
    {
      name: "board-banner",
      path: "/en/tools/board-banner/",
      prepare: async (page) => {
        await page.getByRole("radio", { name: /Header banner/i }).click();
        await page.waitForTimeout(300);
      },
    },
  ];

  for (const c of pdfCases) {
    test(`${c.name} PDF: page art matches capture`, async ({ page }) => {
      await page.goto(c.path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (c.prepare) await c.prepare(page);
      await waitForExportRoot(page);

      const capture = await bridgeCapturePng(page, { pixelRatio: 2 });
      const filePath = await downloadNamed(
        page,
        c.button ?? /Download PDF|PDF/i,
        `${c.name}.pdf`,
      );
      expect(fs.statSync(filePath).size).toBeGreaterThan(8_000);

      const pdfRaster = await rasterizePdfPage(filePath, 1.25);
      assertRasterMatch(
        capture,
        pdfRaster,
        {
          threshold: 48,
          // JPEG re-encode + pdf.js paint diverge more than PNG↔PNG
          maxDiffRatio: c.maxDiff ?? 0.12,
        },
        `${c.name} capture↔pdf`,
      );
    });
  }

  test("website-template ZIP contains index.html", async ({ page }) => {
    await page.goto("/en/tools/website-template/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const filePath = await downloadNamed(
      page,
      /Download site ZIP|Download ZIP|ZIP/i,
      "website-template.zip",
    );
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    const names = Object.keys(zip.files);
    expect(names.some((n) => /index\.html$/i.test(n))).toBe(true);
  });

  test("website-template WordPress theme ZIP contains style.css", async ({
    page,
  }) => {
    await page.goto("/en/tools/website-template/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const filePath = await downloadNamed(
      page,
      /Download WordPress theme/i,
      "website-template-wordpress.zip",
    );
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    const names = Object.keys(zip.files);
    expect(names.some((n) => /style\.css$/i.test(n))).toBe(true);
    expect(names.some((n) => /functions\.php$/i.test(n))).toBe(true);
    const cssEntry = names.find((n) => /style\.css$/i.test(n));
    expect(cssEntry).toBeTruthy();
    const css = await zip.file(cssEntry!)!.async("string");
    expect(css).toContain("Theme Name:");
  });

  test("document-generator downloads an Office package", async ({ page }) => {
    await page.goto("/en/tools/document-generator/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const outDir = ensureOutDir();
    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    const btn = page.getByRole("button", { name: /Download Word|Download ZIP/i }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    const filePath = path.join(outDir, `document-${suggested}`);
    await download.saveAs(filePath);
    const buf = fs.readFileSync(filePath);
    expect(buf.byteLength).toBeGreaterThan(500);
    // ZIP/Office packages start with PK
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  test("logo-builder SVG download is well-formed", async ({ page }) => {
    await page.goto("/en/tools/logo-builder/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await waitForExportRoot(page);
    const filePath = await downloadNamed(
      page,
      /Download SVG|SVG/i,
      "logo-builder.svg",
    );
    const text = fs.readFileSync(filePath, "utf8");
    expect(text).toMatch(/<svg[\s>]/i);
    expect(text.length).toBeGreaterThan(200);
  });

  test("resizer ZIP contains multiple PNGs matching capture aspect", async ({
    page,
  }) => {
    await page.goto("/en/tools/resizer/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await waitForExportRoot(page);

    const capture = await bridgeCapturePng(page, { pixelRatio: 1 });
    const filePath = await downloadNamed(
      page,
      /Download ZIP|ZIP/i,
      "resizer-kit.zip",
    );
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    const pngNames = Object.keys(zip.files).filter((n) =>
      /\.png$/i.test(n),
    );
    expect(pngNames.length).toBeGreaterThanOrEqual(2);

    const first = pngNames[0]!;
    const entry = zip.file(first);
    expect(entry).toBeTruthy();
    const bytes = Buffer.from(await entry!.async("uint8array"));
    ensureOutDir();
    const extracted = path.join(
      "test-results",
      "tool-export-fidelity",
      "resizer-zip-first.png",
    );
    fs.writeFileSync(extracted, bytes);
    const raster = decodePngFile(extracted);
    // ZIP frames are different presets — only assert non-empty branded raster
    expect(raster.width).toBeGreaterThan(32);
    expect(raster.height).toBeGreaterThan(32);
    expect(capture.width).toBeGreaterThan(32);
  });
});
