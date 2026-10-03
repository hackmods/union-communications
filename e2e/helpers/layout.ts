import { expect, type Page } from "@playwright/test";

export async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    // Ignore classic scrollbar-gutter false positives (scrollWidth ≈ innerWidth
    // while clientWidth is reduced by a vertical scrollbar).
    const gutter = Math.max(0, window.innerWidth - root.clientWidth);
    const raw = root.scrollWidth - root.clientWidth;
    return Math.max(0, raw - gutter);
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

/**
 * Hub/Portal composition smoke at desktop widths (VL-HUB-2):
 * - no page horizontal overflow
 * - primary heading visible in the first viewport
 * - longest line measure on main copy stays bounded (not a stretched mobile shell)
 */
export async function assertDesktopComposition(
  page: Page,
  opts: {
    heading: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> };
    /** Prefer a body/prose node; falls back to heading width check when omitted. */
    measure?: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> };
    maxHeadingY?: number;
    maxMeasurePx?: number;
  },
) {
  await assertNoHorizontalOverflow(page);
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  const headingBox = await opts.heading.boundingBox();
  expect(headingBox).toBeTruthy();
  expect(headingBox!.y).toBeLessThan(opts.maxHeadingY ?? viewport!.height);
  const measureBox = opts.measure
    ? await opts.measure.boundingBox()
    : headingBox;
  expect(measureBox).toBeTruthy();
  // At ~1280 a usable work column should not span the full chrome as a phone stack.
  expect(measureBox!.width).toBeLessThanOrEqual(opts.maxMeasurePx ?? 720);
}

/**
 * After a mid-page open, the sheet must cover scrolled copy and keep chrome
 * in view so labels cannot ghost against the page (Home trust band).
 */
export async function assertMobileSheetCoversScrolledPage(
  page: Page,
  opts: {
    drawer: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> };
    chrome: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> };
    covered: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> };
  },
) {
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  const drawerBox = await opts.drawer.boundingBox();
  const chromeBox = await opts.chrome.boundingBox();
  const coveredBox = await opts.covered.boundingBox();
  const scrimBox = await page.getByTestId("mobile-sheet-scrim").boundingBox();
  expect(drawerBox).toBeTruthy();
  expect(chromeBox).toBeTruthy();
  expect(coveredBox).toBeTruthy();
  expect(scrimBox).toBeTruthy();
  expect(chromeBox!.y).toBeGreaterThanOrEqual(-1);
  expect(chromeBox!.y + chromeBox!.height).toBeLessThanOrEqual(viewport!.height + 1);
  expect(drawerBox!.y).toBeGreaterThanOrEqual(chromeBox!.y + chromeBox!.height - 2);
  expect(drawerBox!.x).toBeGreaterThanOrEqual(-1);
  expect(drawerBox!.x + drawerBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(scrimBox!.y).toBeLessThanOrEqual(1);
  expect(scrimBox!.height).toBeGreaterThanOrEqual(viewport!.height - 2);
  expect(scrimBox!.y).toBeLessThanOrEqual(coveredBox!.y + 1);
  expect(scrimBox!.y + scrimBox!.height).toBeGreaterThanOrEqual(
    coveredBox!.y + coveredBox!.height - 1,
  );
}

/** Element's border box must sit inside the layout viewport (1px slack). */
export async function assertFitsViewport(
  page: Page,
  locator: { boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null> },
) {
  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
}
