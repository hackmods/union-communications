import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Guide / Officer Learning text PDFs — download bytes + pdf.js text + embedded
 * UnionOps mark image. Not canvas raster fidelity (see tools.export.fidelity).
 *
 * Workspace notes PDF chrome is covered in `text-pdf-layout.test.ts` (unit);
 * this smoke hits live guide CTAs that stewards actually click.
 */

test.describe.configure({ mode: "serial", timeout: 120_000, retries: 1 });

async function assertTextPdfWithMark(opts: {
  filePath: string;
  minBytes: number;
  titleNeedle: string | RegExp;
  footerNeedle: string | RegExp;
}) {
  const size = fs.statSync(opts.filePath).size;
  expect(size).toBeGreaterThan(opts.minBytes);

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(opts.filePath));
  const doc = await pdfjs.getDocument({ data }).promise;
  expect(doc.numPages).toBeGreaterThanOrEqual(1);

  const page = await doc.getPage(1);
  const text = await page.getTextContent();
  const joined = text.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ");

  expect(joined).toMatch(opts.titleNeedle);
  expect(joined).toMatch(opts.footerNeedle);

  const ops = await page.getOperatorList();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const OPS = (pdfjs as any).OPS ?? {};
  const paintImage = ops.fnArray.some((fn: number) => {
    const name = Object.entries(OPS).find(([, v]) => v === fn)?.[0] ?? "";
    return /paintImage/i.test(name);
  });
  expect(paintImage, "expected UnionOps mark image embed").toBe(true);
}

test.describe("Guide text PDF export smoke @smoke", () => {
  test("FAR + bylaws adoption PDFs embed UnionOps mark and education footer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const outDir = path.join("test-results", "guide-pdf-smoke");
    fs.mkdirSync(outDir, { recursive: true });

    await page.goto("/en/guide/officer-learning/contract-enforcement/", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "Contract Enforcement" }),
    ).toBeVisible({ timeout: 60_000 });

    const farCta = page.getByRole("button", { name: "Download FAR PDF" });
    await farCta.scrollIntoViewIfNeeded();
    const farDownloadPromise = page.waitForEvent("download");
    await farCta.click();
    const farDownload = await farDownloadPromise;
    expect(farDownload.suggestedFilename()).toMatch(/unionops-far-sheet.*\.pdf$/i);
    const farPath = path.join(outDir, farDownload.suggestedFilename());
    await farDownload.saveAs(farPath);
    await assertTextPdfWithMark({
      filePath: farPath,
      minBytes: 3_000,
      titleNeedle: /FAR sheet/i,
      footerNeedle: /UnionOps Officer Learning/i,
    });

    await page.goto("/en/guide/bylaws/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 60_000,
    });

    const bylawsCta = page.locator("#reference").getByRole("button", {
      name: "Download adoption checklist PDF",
    });
    await bylawsCta.scrollIntoViewIfNeeded();
    const bylawsDownloadPromise = page.waitForEvent("download");
    await bylawsCta.click();
    const bylawsDownload = await bylawsDownloadPromise;
    expect(bylawsDownload.suggestedFilename()).toMatch(
      /unionops-bylaws-adoption-checklist.*\.pdf$/i,
    );
    const bylawsPath = path.join(outDir, bylawsDownload.suggestedFilename());
    await bylawsDownload.saveAs(bylawsPath);
    await assertTextPdfWithMark({
      filePath: bylawsPath,
      minBytes: 3_000,
      titleNeedle: /Local bylaws/i,
      footerNeedle: /UnionOps Officer Learning/i,
    });
  });

  test("FR FAR sheet uses French education footer", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const outDir = path.join("test-results", "guide-pdf-smoke");
    fs.mkdirSync(outDir, { recursive: true });

    await page.goto("/fr/guide/officer-learning/contract-enforcement/", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 60_000,
    });

    const farCta = page.getByRole("button", {
      name: "Télécharger la fiche FAR (PDF)",
    });
    await farCta.scrollIntoViewIfNeeded();
    const downloadPromise = page.waitForEvent("download");
    await farCta.click();
    const download = await downloadPromise;
    const filePath = path.join(outDir, `fr-${download.suggestedFilename()}`);
    await download.saveAs(filePath);
    await assertTextPdfWithMark({
      filePath,
      minBytes: 3_000,
      titleNeedle: /FAR|Faits/i,
      footerNeedle: /UnionOps Formation des dirigeants/i,
    });
  });
});
