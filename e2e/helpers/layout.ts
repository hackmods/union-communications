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
