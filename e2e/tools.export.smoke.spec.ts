import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  assertCaptureHasBrandAndInk,
  sampleImageData,
} from "../src/lib/export/fidelity";

/**
 * Phase 9c — tool output smoke: downloads must contain branded field + ink,
 * not merely that a Download button exists (builders.smoke).
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

test.describe("Tool export output smoke @smoke", () => {
  test("Flyer Maker PNG keeps brand field and type ink", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/tools/flyer-maker/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);

    const outDir = path.join("test-results", "tool-export-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, download.suggestedFilename());
    await download.saveAs(filePath);
    expect(fs.statSync(filePath).size).toBeGreaterThan(8_000);

    const raw = await sampleDownloadedPng(page, filePath);
    const sample = sampleImageData(
      Uint8ClampedArray.from(raw.data),
      raw.width,
      raw.height,
      { step: 8 },
    );
    const check = assertCaptureHasBrandAndInk(sample, {
      minField: 80,
      minInk: 20,
    });
    expect(check.ok, check.reason).toBe(true);
  });

  test("Flyer Maker PDF is a real download with embedded page art", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/tools/flyer-maker/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const outDir = path.join("test-results", "tool-export-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, download.suggestedFilename());
    await download.saveAs(filePath);
    const size = fs.statSync(filePath).size;
    // JPEG-compressed page art should be well under the old multi-MB raw PNG embeds
    expect(size).toBeGreaterThan(20_000);
    expect(size).toBeLessThan(2_500_000);

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjs.getDocument({ data }).promise;
    expect(doc.numPages).toBe(1);
    const pdfPage = await doc.getPage(1);
    const ops = await pdfPage.getOperatorList();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OPS = (pdfjs as any).OPS ?? {};
    const paintImage = ops.fnArray.some((fn: number) => {
      const name = Object.entries(OPS).find(([, v]) => v === fn)?.[0] ?? "";
      return /paintImage/i.test(name);
    });
    expect(paintImage).toBe(true);
  });

  test("Graphic Maker PNG keeps brand field and type ink", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/tools/graphic-maker/");
    await expect(
      page.getByRole("heading", { name: /Graphic Maker/i }),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);

    const outDir = path.join("test-results", "tool-export-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `graphic-${download.suggestedFilename()}`);
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

  test("Board Notice PDF downloads with embedded page art", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/tools/board-notice/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download PDF|PDF/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const outDir = path.join("test-results", "tool-export-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, download.suggestedFilename());
    await download.saveAs(filePath);
    expect(fs.statSync(filePath).size).toBeGreaterThan(15_000);

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjs.getDocument({ data }).promise;
    expect(doc.numPages).toBeGreaterThanOrEqual(1);
    const pdfPage = await doc.getPage(1);
    const ops = await pdfPage.getOperatorList();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OPS = (pdfjs as any).OPS ?? {};
    const paintImage = ops.fnArray.some((fn: number) => {
      const name = Object.entries(OPS).find(([, v]) => v === fn)?.[0] ?? "";
      return /paintImage/i.test(name);
    });
    expect(paintImage).toBe(true);
  });

  test("Solidarity Poster PNG keeps brand field and type ink", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/tools/solidarity-poster/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download PNG|PNG/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);

    const outDir = path.join("test-results", "tool-export-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(
      outDir,
      `solidarity-${download.suggestedFilename()}`,
    );
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
      minField: 30,
      minInk: 8,
    });
    expect(check.ok, check.reason).toBe(true);
  });

  test("Org Chart PNG keeps brand field and type ink", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/tools/org-chart/");
    await expect(page.getByRole("heading", { name: "Org Chart" })).toBeVisible();
    // Wait for lg preview (tabs hide) so html-to-image is not capturing a scaled mini stage.
    await expect(page.getByRole("tab", { name: "Edit" })).toBeHidden();
    await expect(page.locator("[data-export-root]")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/i);

    const outDir = path.join("test-results", "tool-export-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(
      outDir,
      `org-chart-${download.suggestedFilename()}`,
    );
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
      minField: 30,
      minInk: 8,
    });
    expect(check.ok, check.reason).toBe(true);
  });
});
