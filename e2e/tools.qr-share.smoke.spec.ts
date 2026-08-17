import { test, expect, type Page, type Locator } from "@playwright/test";
import { EXPORT_ROOT_SELECTOR } from "../src/lib/export/export-root";
import { seedCanvasFonts } from "./helpers/canvas-fonts";

const LONG_URL =
  "https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees";

async function waitForQrPreview(page: Page): Promise<Locator> {
  const root = page.locator(EXPORT_ROOT_SELECTOR);
  await expect(root).toBeVisible({ timeout: 20_000 });
  await expect(root.locator("[data-qr-plate] img").first()).toBeAttached({
    timeout: 15_000,
  });
  await expect
    .poll(async () => {
      return root.locator("[data-qr-plate] img").evaluateAll((imgs) =>
        imgs.some((img) => {
          const r = img.getBoundingClientRect();
          return r.width >= 20 && r.height >= 20;
        }),
      );
    }, { timeout: 15_000 })
    .toBe(true);
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

type PlateFillReport = {
  plateCount: number;
  imgCount: number;
  minFill: number;
  maxAspect: number;
  minAspect: number;
  minImgPx: number;
  urlFooterOverlaps: number;
  footerBelowPlates: number;
  platesOutsideCell: number;
  platesOutsideRoot: number;
};

const QR_BOARD_PRESET_CASES = [
  { id: "membershipFtPt", slots: 2, minImgPx: 72 },
  { id: "twoCampaigns", slots: 2, minImgPx: 72 },
  { id: "coreLinks", slots: 4, minImgPx: 64 },
  { id: "fullBoard", slots: 6, minImgPx: 48 },
] as const;

async function measurePlateFill(page: Page): Promise<PlateFillReport> {
  return page.evaluate((rootSel) => {
    const root = document.querySelector(rootSel);
    if (!root) {
      return {
        plateCount: 0,
        imgCount: 0,
        minFill: 0,
        maxAspect: 0,
        minAspect: 0,
        minImgPx: 0,
        urlFooterOverlaps: 0,
        footerBelowPlates: 0,
        platesOutsideCell: 0,
        platesOutsideRoot: 0,
      };
    }
    const rr = root.getBoundingClientRect();
    const plates = [...root.querySelectorAll("[data-qr-plate]")];
    let minFill = Infinity;
    let maxAspect = 0;
    let minAspect = Infinity;
    let minImgPx = Infinity;
    let imgCount = 0;
    let platesOutsideCell = 0;
    let platesOutsideRoot = 0;
    for (const plate of plates) {
      const pr = plate.getBoundingClientRect();
      if (pr.width < 4 || pr.height < 4) continue;
      const aspect = pr.height / pr.width;
      maxAspect = Math.max(maxAspect, aspect);
      minAspect = Math.min(minAspect, aspect);
      const img = plate.querySelector("img");
      if (!img) continue;
      imgCount += 1;
      const ir = img.getBoundingClientRect();
      minImgPx = Math.min(minImgPx, ir.width, ir.height);
      minFill = Math.min(minFill, ir.width / pr.width, ir.height / pr.height);

      const cell = plate.closest("[data-qr-cell]");
      if (cell) {
        const cr = cell.getBoundingClientRect();
        if (
          pr.left < cr.left - 1.5 ||
          pr.top < cr.top - 1.5 ||
          pr.right > cr.right + 1.5 ||
          pr.bottom > cr.bottom + 1.5
        ) {
          platesOutsideCell += 1;
        }
      }
      if (
        pr.left < rr.left - 1.5 ||
        pr.top < rr.top - 1.5 ||
        pr.right > rr.right + 1.5 ||
        pr.bottom > rr.bottom + 1.5
      ) {
        platesOutsideRoot += 1;
      }
    }

    const urls = [...root.querySelectorAll("[data-canvas-url]")];
    const footer = root.querySelector("[data-board-footer]");
    let urlFooterOverlaps = 0;
    let footerBelowPlates = 0;
    if (footer) {
      const fr = footer.getBoundingClientRect();
      for (const urlEl of urls) {
        const ur = urlEl.getBoundingClientRect();
        const cell = urlEl.closest("[data-qr-cell]");
        const cr = cell?.getBoundingClientRect();
        const top = cr ? Math.max(ur.top, cr.top) : ur.top;
        const bottom = cr ? Math.min(ur.bottom, cr.bottom) : ur.bottom;
        const left = cr ? Math.max(ur.left, cr.left) : ur.left;
        const right = cr ? Math.min(ur.right, cr.right) : ur.right;
        if (bottom - top < 1 || right - left < 1) continue;
        const oy = Math.min(bottom, fr.bottom) - Math.max(top, fr.top);
        if (oy > 4) urlFooterOverlaps += 1;
      }
      const firstPlate = plates[0]?.getBoundingClientRect();
      if (firstPlate && fr.bottom > firstPlate.top + 4) {
        footerBelowPlates += 1;
      }
    }

    return {
      plateCount: plates.length,
      imgCount,
      minFill: minFill === Infinity ? 0 : minFill,
      maxAspect: maxAspect || 0,
      minAspect: minAspect === Infinity ? 0 : minAspect,
      minImgPx: minImgPx === Infinity ? 0 : minImgPx,
      urlFooterOverlaps,
      footerBelowPlates,
      platesOutsideCell,
      platesOutsideRoot,
    };
  }, EXPORT_ROOT_SELECTOR);
}

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

  test("qr-board presets keep QRs uncropped and branding in the header", async ({
    page,
  }) => {
    await seedCanvasFonts(page);

    for (const preset of QR_BOARD_PRESET_CASES) {
      await page.goto(`/en/tools/qr-board/?preset=${preset.id}`);
      await expect(
        page.getByRole("heading", { name: "QR Board Poster Maker" }),
      ).toBeVisible();
      await expect(page.getByLabel(/Board preset/i)).toHaveValue(preset.id);
      await enableShowUrl(page, /Show URL under each QR/i);

      const root = await waitForQrPreview(page);
      const captions = root.locator("[data-canvas-url]");
      await expect(captions).toHaveCount(preset.slots, { timeout: 15_000 });
      await expect(root).toHaveAttribute(
        "data-qr-board-density",
        preset.slots <= 2 ? "roomy" : preset.slots <= 4 ? "regular" : "compact",
      );

      if (preset.id === "fullBoard") {
        await expect(captions.nth(4)).toContainText("ontario.ca");
        await expect(captions.nth(4)).not.toContainText("https://");
      }

      const layout = await measureUrlLayout(page);
      expect(layout.urlCount, preset.id).toBe(preset.slots);
      expect(layout.overlaps, preset.id).toBe(0);
      expect(layout.truncatedNowrap, preset.id).toBe(0);
      expect(layout.minFontPx, preset.id).toBeGreaterThanOrEqual(9);

      const fill = await measurePlateFill(page);
      expect(fill.imgCount, preset.id).toBe(preset.slots);
      expect(fill.minFill, preset.id).toBeGreaterThan(0.65);
      expect(fill.minAspect, preset.id).toBeGreaterThan(0.85);
      expect(fill.maxAspect, preset.id).toBeLessThan(1.2);
      expect(fill.minImgPx, preset.id).toBeGreaterThan(preset.minImgPx);
      expect(fill.urlFooterOverlaps, preset.id).toBe(0);
      expect(fill.footerBelowPlates, preset.id).toBe(0);
      expect(fill.platesOutsideCell, preset.id).toBe(0);
      expect(fill.platesOutsideRoot, preset.id).toBe(0);
    }
  });

  test("qr-board 4-up stays uncropped when the preview column shrinks", async ({
    page,
  }) => {
    await seedCanvasFonts(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/tools/qr-board/?preset=coreLinks");
    await expect(
      page.getByRole("heading", { name: "QR Board Poster Maker" }),
    ).toBeVisible();
    await enableShowUrl(page, /Show URL under each QR/i);
    await page.getByRole("tab", { name: /^Preview$/i }).click();

    const root = await waitForQrPreview(page);
    await expect(root.locator("[data-canvas-url]")).toHaveCount(4, {
      timeout: 15_000,
    });

    const fit = page.locator("[data-qr-board-fit]");
    await expect(fit).toBeVisible();
    const fitBox = await fit.boundingBox();
    const rootBox = await root.boundingBox();
    expect(fitBox?.width ?? 0).toBeGreaterThan(0);
    expect(rootBox?.width ?? 0).toBeLessThanOrEqual((fitBox?.width ?? 0) + 2);

    const fill = await measurePlateFill(page);
    expect(fill.imgCount).toBe(4);
    expect(fill.minAspect).toBeGreaterThan(0.85);
    expect(fill.maxAspect).toBeLessThan(1.2);
    expect(fill.platesOutsideCell).toBe(0);
    expect(fill.platesOutsideRoot).toBe(0);
    expect(fill.urlFooterOverlaps).toBe(0);
    expect(fill.footerBelowPlates).toBe(0);
    expect(fill.minImgPx).toBeGreaterThan(40);

    const layout = await measureUrlLayout(page);
    expect(layout.overlaps).toBe(0);
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
