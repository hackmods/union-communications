import { expect, type Locator, type Page } from "@playwright/test";
import { EXPORT_ROOT_SELECTOR } from "../../src/lib/export/export-root";
import {
  PLATE_ASPECT_MAX,
  PLATE_ASPECT_MIN,
  PLATE_FILL_MIN,
} from "../../src/lib/utils/canvas-layout-geometry";

export type OverlapReport = {
  urlCount: number;
  overlaps: number;
  minFontPx: number;
  truncatedNowrap: number;
};

export type PlateFillReport = {
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

export type PreviewFitReport = {
  visualWidth: number;
  columnWidth: number;
};

export async function waitForExportRoot(page: Page): Promise<Locator> {
  const root = page.locator(EXPORT_ROOT_SELECTOR);
  await expect(root).toBeVisible({ timeout: 20_000 });
  return root;
}

export async function waitForQrPreview(page: Page): Promise<Locator> {
  const root = await waitForExportRoot(page);
  await expect(root.locator("[data-qr-plate] img").first()).toBeAttached({
    timeout: 15_000,
  });
  await expect
    .poll(async () => {
      return root.locator("[data-qr-plate]").evaluateAll((plates) =>
        plates.some((plate) => {
          const el = plate as HTMLElement;
          if (el.offsetWidth >= 12 && el.offsetHeight >= 12) return true;
          const img = plate.querySelector("img") as HTMLImageElement | null;
          return (img?.naturalWidth ?? 0) >= 12;
        }),
      );
    }, { timeout: 15_000 })
    .toBe(true);
  return root;
}

export async function openOptionsSection(page: Page): Promise<void> {
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

export async function enableShowUrl(page: Page, label: RegExp): Promise<void> {
  await openOptionsSection(page);
  const checkbox = page.getByRole("checkbox", { name: label });
  await expect(checkbox).toBeVisible();
  if (!(await checkbox.isChecked())) {
    await checkbox.check();
  }
  await expect(checkbox).toBeChecked();
}

export async function openPreviewTab(page: Page): Promise<void> {
  const tab = page.getByRole("tab", { name: /^Preview$/i });
  if ((await tab.count()) === 0) return;
  await tab.click();
}

/**
 * Clip / overlap math is duplicated inside evaluate (Playwright cannot
 * pass functions). Keep in sync with `canvas-layout-geometry.ts`.
 */
export async function measurePlateFill(page: Page): Promise<PlateFillReport> {
  return page.evaluate((rootSel) => {
    const empty: PlateFillReport = {
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
    const root = document.querySelector(rootSel);
    if (!root) return empty;

    const toRect = (r: DOMRect) => ({
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
    });
    const clipRect = (
      inner: { left: number; top: number; right: number; bottom: number },
      outer: { left: number; top: number; right: number; bottom: number },
    ) => {
      const left = Math.max(inner.left, outer.left);
      const top = Math.max(inner.top, outer.top);
      const right = Math.min(inner.right, outer.right);
      const bottom = Math.min(inner.bottom, outer.bottom);
      if (bottom - top < 1 || right - left < 1) return null;
      return { left, top, right, bottom };
    };
    const rectOutside = (
      inner: { left: number; top: number; right: number; bottom: number },
      outer: { left: number; top: number; right: number; bottom: number },
      epsilon = 1.5,
    ) =>
      inner.left < outer.left - epsilon ||
      inner.top < outer.top - epsilon ||
      inner.right > outer.right + epsilon ||
      inner.bottom > outer.bottom + epsilon;

    const rr = toRect(root.getBoundingClientRect());
    const plates = [...root.querySelectorAll("[data-qr-plate]")];
    let minFill = Infinity;
    let maxAspect = 0;
    let minAspect = Infinity;
    let minImgPx = Infinity;
    let imgCount = 0;
    let platesOutsideCell = 0;
    let platesOutsideRoot = 0;
    for (const plate of plates) {
      const pr = toRect(plate.getBoundingClientRect());
      const plateEl = plate as HTMLElement;
      const layoutW = plateEl.offsetWidth;
      const layoutH = plateEl.offsetHeight;
      if (layoutW < 4 || layoutH < 4) continue;
      const aspect = layoutH / layoutW;
      maxAspect = Math.max(maxAspect, aspect);
      minAspect = Math.min(minAspect, aspect);
      const img = plate.querySelector("img");
      if (!img) continue;
      imgCount += 1;
      const ir = img.getBoundingClientRect();
      minImgPx = Math.min(minImgPx, ir.width, ir.height);
      const cs = getComputedStyle(plate);
      const padX =
        (Number.parseFloat(cs.paddingLeft) || 0) +
        (Number.parseFloat(cs.paddingRight) || 0);
      const padY =
        (Number.parseFloat(cs.paddingTop) || 0) +
        (Number.parseFloat(cs.paddingBottom) || 0);
      // clientWidth is layout px (ignores parent scale) — padding is also layout px.
      const innerW = Math.max(1, plate.clientWidth - padX);
      const innerH = Math.max(1, plate.clientHeight - padY);
      const imgW = img.clientWidth || ir.width;
      const imgH = img.clientHeight || ir.height;
      minFill = Math.min(minFill, imgW / innerW, imgH / innerH);

      const cell = plate.closest("[data-qr-cell]");
      if (cell && rectOutside(pr, toRect(cell.getBoundingClientRect()))) {
        platesOutsideCell += 1;
      }
      const rootEl = root as HTMLElement;
      if (
        plateEl.offsetLeft + plateEl.offsetWidth > rootEl.offsetWidth + 2 ||
        plateEl.offsetTop + plateEl.offsetHeight > rootEl.offsetHeight + 2 ||
        plateEl.offsetLeft < -1 ||
        plateEl.offsetTop < -1
      ) {
        platesOutsideRoot += 1;
      }
    }

    const urls = [...root.querySelectorAll("[data-canvas-url]")];
    const footer = root.querySelector("[data-board-footer]");
    let urlFooterOverlaps = 0;
    let footerBelowPlates = 0;
    if (footer) {
      const fr = toRect(footer.getBoundingClientRect());
      for (const urlEl of urls) {
        const ur = toRect(urlEl.getBoundingClientRect());
        const cell = urlEl.closest("[data-qr-cell]");
        const clipTo = cell ? toRect(cell.getBoundingClientRect()) : rr;
        const clipped = clipRect(ur, clipTo);
        if (!clipped) continue;
        const oy =
          Math.min(clipped.bottom, fr.bottom) - Math.max(clipped.top, fr.top);
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

export async function measureUrlLayout(page: Page): Promise<OverlapReport> {
  return page.evaluate((rootSel) => {
    const empty: OverlapReport = {
      urlCount: 0,
      overlaps: 0,
      minFontPx: 0,
      truncatedNowrap: 0,
    };
    const root = document.querySelector(rootSel);
    if (!root) return empty;

    const toRect = (r: DOMRect) => ({
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
    });
    const clipRect = (
      inner: { left: number; top: number; right: number; bottom: number },
      outer: { left: number; top: number; right: number; bottom: number },
    ) => {
      const left = Math.max(inner.left, outer.left);
      const top = Math.max(inner.top, outer.top);
      const right = Math.min(inner.right, outer.right);
      const bottom = Math.min(inner.bottom, outer.bottom);
      if (bottom - top < 1 || right - left < 1) return null;
      return { left, top, right, bottom };
    };
    const rectsOverlap = (
      a: { left: number; top: number; right: number; bottom: number },
      b: { left: number; top: number; right: number; bottom: number },
      minPx = 1,
    ) => {
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      return oy > minPx && ox > minPx;
    };

    const rr = toRect(root.getBoundingClientRect());
    const urls = [...root.querySelectorAll("[data-canvas-url]")];
    let overlaps = 0;
    let minFontPx = Infinity;
    let truncatedNowrap = 0;

    for (const urlEl of urls) {
      const ur = toRect(urlEl.getBoundingClientRect());
      const cs = getComputedStyle(urlEl);
      const fontPx = Number.parseFloat(cs.fontSize) || 0;
      if (fontPx < minFontPx) minFontPx = fontPx;
      if (cs.whiteSpace === "nowrap" && cs.textOverflow === "ellipsis") {
        truncatedNowrap += 1;
      }

      const cell = urlEl.closest("[data-qr-cell]");
      const clipTo = cell ? toRect(cell.getBoundingClientRect()) : rr;
      const clipped = clipRect(ur, clipTo);
      if (!clipped) continue;

      const slotHost = cell ?? urlEl.parentElement ?? root;
      const slot = slotHost.querySelector("[data-qr-slot]");
      const plates = slot
        ? [slot]
        : [...slotHost.querySelectorAll("[data-qr-plate]")];
      for (const plate of plates) {
        if (!plate) continue;
        const pr = toRect(plate.getBoundingClientRect());
        if (rectsOverlap(clipped, pr, 1)) overlaps += 1;
      }
    }

    return {
      urlCount: urls.length,
      overlaps,
      minFontPx: minFontPx === Infinity ? 0 : minFontPx,
      truncatedNowrap,
    };
  }, EXPORT_ROOT_SELECTOR);
}

export async function measurePreviewFit(page: Page): Promise<PreviewFitReport> {
  return page.evaluate((rootSel) => {
    const root = document.querySelector(rootSel);
    if (!root) return { visualWidth: 0, columnWidth: 0 };
    const fit =
      document.querySelector("[data-fit-width]") ??
      document.querySelector("[data-qr-board-fit]");
    const visual = (fit ?? root).getBoundingClientRect();
    const column =
      root.closest('[role="tabpanel"]') ?? root.parentElement;
    const col = column?.getBoundingClientRect();
    return {
      visualWidth: visual.width,
      columnWidth: col?.width ?? 0,
    };
  }, EXPORT_ROOT_SELECTOR);
}

export function expectPlateGeometry(
  fill: PlateFillReport,
  opts: { label?: string; slots?: number; minImgPx?: number } = {},
): void {
  const label = opts.label ?? "plates";
  if (opts.slots != null) {
    expect(fill.imgCount, label).toBe(opts.slots);
  } else {
    expect(fill.imgCount, label).toBeGreaterThan(0);
  }
  expect(fill.minFill, label).toBeGreaterThan(PLATE_FILL_MIN);
  expect(fill.minAspect, label).toBeGreaterThan(PLATE_ASPECT_MIN);
  expect(fill.maxAspect, label).toBeLessThan(PLATE_ASPECT_MAX);
  if (opts.minImgPx != null) {
    expect(fill.minImgPx, label).toBeGreaterThan(opts.minImgPx);
  }
  expect(fill.platesOutsideCell, label).toBe(0);
  expect(fill.platesOutsideRoot, label).toBe(0);
  expect(fill.urlFooterOverlaps, label).toBe(0);
  expect(fill.footerBelowPlates, label).toBe(0);
}

export function expectUrlLayout(
  report: OverlapReport,
  opts: { label?: string; urlCount?: number } = {},
): void {
  const label = opts.label ?? "urls";
  if (opts.urlCount != null) {
    expect(report.urlCount, label).toBe(opts.urlCount);
  }
  expect(report.overlaps, label).toBe(0);
  expect(report.truncatedNowrap, label).toBe(0);
}

export function expectPreviewFitsColumn(
  fit: PreviewFitReport,
  label = "preview",
): void {
  expect(fit.visualWidth, label).toBeGreaterThan(0);
  expect(fit.columnWidth, label).toBeGreaterThan(0);
  expect(fit.visualWidth, label).toBeLessThanOrEqual(fit.columnWidth + 2);
}
