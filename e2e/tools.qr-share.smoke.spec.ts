import { test, expect, type Page, type Locator } from "@playwright/test";
import { EXPORT_ROOT_SELECTOR } from "../src/lib/export/export-root";
import { seedCanvasFonts } from "./helpers/canvas-fonts";

const LONG_URL =
  "https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees";

async function waitForQrPreview(page: Page): Promise<Locator> {
  const root = page.locator(EXPORT_ROOT_SELECTOR);
  await expect(root).toBeVisible({ timeout: 20_000 });
  await expect(root.locator("img").first()).toBeAttached({ timeout: 15_000 });
  return root;
}

async function openOptionsSection(page: Page): Promise<void> {
  const details = page.locator("details").filter({ hasText: /^Options/i });
  if ((await details.count()) === 0) return;
  const first = details.first();
  const isOpen = await first.evaluate(
    (el) => (el as HTMLDetailsElement).open,
  );
  if (!isOpen) {
    await first.locator("summary").click();
  }
}

async function enableShowUrl(page: Page, label: RegExp): Promise<void> {
  await openOptionsSection(page);
  const checkbox = page.getByRole("checkbox", { name: label });
  await expect(checkbox).toBeVisible();
  if (!(await checkbox.isChecked())) {
    await checkbox.check();
  }
  await expect(checkbox).toBeChecked();
}

type OverlapReport = {
  urlCount: number;
  overlaps: number;
  minFontPx: number;
  truncatedNowrap: number;
  sizes: { w: number; h: number }[];
};

async function measureUrlLayout(page: Page): Promise<OverlapReport> {
  return page.evaluate((rootSel) => {
    const root = document.querySelector(rootSel);
    if (!root) {
      return {
        urlCount: 0,
        overlaps: 0,
        minFontPx: 0,
        truncatedNowrap: 0,
        sizes: [],
      };
    }
    const urls = [...root.querySelectorAll("[data-canvas-url]")];
    let overlaps = 0;
    let minFontPx = Infinity;
    let truncatedNowrap = 0;

    for (const urlEl of urls) {
      const ur = urlEl.getBoundingClientRect();
      const cs = getComputedStyle(urlEl);
      const fontPx = Number.parseFloat(cs.fontSize) || 0;
      if (fontPx < minFontPx) minFontPx = fontPx;
      if (cs.whiteSpace === "nowrap" && cs.textOverflow === "ellipsis") {
        truncatedNowrap += 1;
      }

      const cell =
        urlEl.closest(".grid > div") ?? urlEl.parentElement ?? root;
      // Prefer the reserved QR slot (board) so plate chrome that clips inside
      // overflow:hidden is not treated as covering the caption.
      const slot = cell.querySelector("[data-qr-slot]");
      const plates = slot
        ? [slot]
        : [...cell.querySelectorAll("img")].map((img) => img.parentElement);
      for (const plate of plates) {
        if (!plate) continue;
        const pr = plate.getBoundingClientRect();
        const oy = Math.min(ur.bottom, pr.bottom) - Math.max(ur.top, pr.top);
        const ox = Math.min(ur.right, pr.right) - Math.max(ur.left, pr.left);
        if (oy > 1 && ox > 1) overlaps += 1;
      }
    }

    return {
      urlCount: urls.length,
      overlaps,
      minFontPx: minFontPx === Infinity ? 0 : minFontPx,
      truncatedNowrap,
      sizes: [],
    };
  }, EXPORT_ROOT_SELECTOR);
}

test.describe("QR share URL captions @smoke", () => {
  test("qr-card shows wrapped URL below QR and scales with size", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-card/");
    await expect(
      page.getByRole("heading", { name: "QR Link Card Maker" }),
    ).toBeVisible();

    await enableShowUrl(page, /Show URL under tagline/i);
    await page.getByLabel(/Link or text to encode/i).fill(LONG_URL);

    const root = await waitForQrPreview(page);
    await expect(root.locator("[data-canvas-url]")).toBeVisible();
    await expect(root.locator("[data-canvas-url]")).toContainText("ontario.ca");
    await expect(root.locator("[data-canvas-url]")).not.toHaveCSS(
      "text-overflow",
      "ellipsis",
    );

    const quarter = await measureUrlLayout(page);
    expect(quarter.urlCount).toBe(1);
    expect(quarter.overlaps).toBe(0);
    expect(quarter.truncatedNowrap).toBe(0);
    expect(quarter.minFontPx).toBeGreaterThanOrEqual(9);

    const quarterBox = await root.boundingBox();
    expect(quarterBox?.width).toBeTruthy();

    await page.getByRole("radio", { name: /Letter \(8\.5/i }).click();
    await expect(
      page.getByText(/Preview at Letter/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(root.locator("[data-canvas-url]")).toBeVisible();

    const letterBox = await root.boundingBox();
    expect(letterBox?.width ?? 0).toBeGreaterThan((quarterBox?.width ?? 0) + 40);

    const letter = await measureUrlLayout(page);
    expect(letter.overlaps).toBe(0);
    expect(letter.minFontPx).toBeGreaterThanOrEqual(quarter.minFontPx);
  });

  test("qr-board keeps dense URLs readable and clear of QR plates", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/qr-board/?preset=fullBoard");
    await expect(
      page.getByRole("heading", { name: "QR Board Poster Maker" }),
    ).toBeVisible();

    await expect(page.getByLabel(/Board preset/i)).toHaveValue("fullBoard");
    await enableShowUrl(page, /Show URL under each QR/i);

    const root = await waitForQrPreview(page);
    const captions = root.locator("[data-canvas-url]");
    await expect(captions.first()).toBeVisible({ timeout: 15_000 });
    await expect(captions).toHaveCount(6, { timeout: 15_000 });

    // Long Ontario links should display without https://www.
    await expect(captions.nth(4)).toContainText("ontario.ca");
    await expect(captions.nth(4)).not.toContainText("https://");

    const report = await measureUrlLayout(page);
    expect(report.urlCount).toBe(6);
    expect(report.overlaps).toBe(0);
    expect(report.truncatedNowrap).toBe(0);
    expect(report.minFontPx).toBeGreaterThanOrEqual(9);
  });

  test("action-card URL caption stays below QR when shown", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.goto("/en/tools/action-card/");
    await expect(
      page.getByRole("heading", { name: "Action Card Maker" }),
    ).toBeVisible();

    await enableShowUrl(page, /Show URL under the call to action/i);
    await page.getByLabel(/Petition \/ sign-on link/i).fill(LONG_URL);

    const root = await waitForQrPreview(page);
    await expect(root.locator("[data-canvas-url]")).toContainText("ontario.ca");

    const report = await measureUrlLayout(page);
    expect(report.urlCount).toBe(1);
    expect(report.overlaps).toBe(0);
    expect(report.truncatedNowrap).toBe(0);
    expect(report.minFontPx).toBeGreaterThanOrEqual(9);
  });
});
