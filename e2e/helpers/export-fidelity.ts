import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import type { Page } from "@playwright/test";
import {
  compareRasters,
  type CompareRastersOptions,
  type RasterBuffer,
} from "../../src/lib/export/fidelity";
import { EXPORT_ROOT_SELECTOR } from "../../src/lib/export/export-root";

export const EXPORT_FIDELITY_OUT = path.join(
  "test-results",
  "tool-export-fidelity",
);

type CaptureBridge = {
  __unionopsCaptureExportRoot?: (opts?: {
    pixelRatio?: number;
    backgroundColor?: string | null;
  }) => Promise<string>;
  __unionopsBeginUnscaleExportRoot?: () => void;
  __unionopsEndUnscaleExportRoot?: () => void;
};

export function ensureOutDir(): string {
  fs.mkdirSync(EXPORT_FIDELITY_OUT, { recursive: true });
  return EXPORT_FIDELITY_OUT;
}

export function decodePngFile(filePath: string): RasterBuffer {
  const png = PNG.sync.read(fs.readFileSync(filePath));
  return {
    data: png.data,
    width: png.width,
    height: png.height,
  };
}

export function decodePngBuffer(buf: Buffer): RasterBuffer {
  const png = PNG.sync.read(buf);
  return {
    data: png.data,
    width: png.width,
    height: png.height,
  };
}

export function decodeDataUrlPng(dataUrl: string): RasterBuffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return decodePngBuffer(Buffer.from(base64, "base64"));
}

export async function waitForExportRoot(page: Page): Promise<void> {
  // Desktop sticky preview (ToolEditorLayout useIsLg) — avoid mini-stage races
  await page.waitForFunction(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  await page.waitForTimeout(150);
  await page.waitForFunction(
    (sel) => Boolean(document.querySelector(sel)),
    EXPORT_ROOT_SELECTOR,
    { timeout: 20_000 },
  );
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  // Settle layout / QR / brand logo
  await page.waitForTimeout(400);
}

export async function bridgeCapturePng(
  page: Page,
  opts?: { pixelRatio?: number; backgroundColor?: string | null },
): Promise<RasterBuffer> {
  const dataUrl = await page.evaluate(async (captureOpts) => {
    const w = window as Window & CaptureBridge;
    if (!w.__unionopsCaptureExportRoot) {
      throw new Error("ExportCaptureBridge not installed");
    }
    return w.__unionopsCaptureExportRoot(captureOpts ?? { pixelRatio: 2 });
  }, opts);
  return decodeDataUrlPng(dataUrl);
}

/**
 * Chromium paint of the export root (preview), with MobilePreviewStage scale cleared.
 */
export async function previewPaintPng(page: Page): Promise<RasterBuffer> {
  await page.evaluate(() => {
    const w = window as Window & CaptureBridge;
    w.__unionopsBeginUnscaleExportRoot?.();
  });
  try {
    await page.waitForTimeout(50);
    const root = page.locator(EXPORT_ROOT_SELECTOR).first();
    await root.waitFor({ state: "visible", timeout: 15_000 });
    const buf = await root.screenshot({
      type: "png",
      animations: "disabled",
    });
    return decodePngBuffer(Buffer.from(buf));
  } finally {
    await page.evaluate(() => {
      const w = window as Window & CaptureBridge;
      w.__unionopsEndUnscaleExportRoot?.();
    });
  }
}

export async function downloadNamed(
  page: Page,
  buttonName: RegExp | string,
  saveAs: string,
): Promise<string> {
  const outDir = ensureOutDir();
  const downloadPromise = page.waitForEvent("download", { timeout: 45_000 });
  await page.getByRole("button", { name: buttonName }).first().click();
  const download = await downloadPromise;
  const filePath = path.join(outDir, saveAs);
  await download.saveAs(filePath);
  return filePath;
}

export function assertRasterMatch(
  reference: RasterBuffer,
  candidate: RasterBuffer,
  opts: CompareRastersOptions,
  label: string,
): void {
  const result = compareRasters(reference, candidate, opts);
  if (!result.ok) {
    throw new Error(`${label}: ${result.reason}`);
  }
}

/**
 * Rasterize PDF page 1 via pdf.js + @napi-rs/canvas (Node).
 */
export async function rasterizePdfPage(
  filePath: string,
  scale = 1.5,
): Promise<RasterBuffer> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const pdfPage = await doc.getPage(1);
  const viewport = pdfPage.getViewport({ scale });
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  const ctx = canvas.getContext("2d");
  await pdfPage.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: canvas as unknown as HTMLCanvasElement,
  }).promise;
  const png = Buffer.from(
    canvas.toBuffer("image/png"),
  );
  return decodePngBuffer(png);
}

export function writeSampleUploadPng(dest: string): void {
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  // 128×128 brand-orange field with a white square (enough structure for resizer)
  const png = new PNG({ width: 128, height: 128 });
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) << 2;
      const inSquare = x > 40 && x < 88 && y > 40 && y < 88;
      png.data[i] = inSquare ? 255 : 194;
      png.data[i + 1] = inSquare ? 255 : 65;
      png.data[i + 2] = inSquare ? 255 : 12;
      png.data[i + 3] = 255;
    }
  }
  fs.writeFileSync(dest, PNG.sync.write(png));
}
