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
