import { describe, expect, it } from "vitest";
import { solidaritySupportChrome } from "./solidarity-poster-chrome";

describe("solidaritySupportChrome", () => {
  it("sizes letter lead/footer above rem-xs without breaking the meta cap", () => {
    const letter = solidaritySupportChrome(850);
    expect(letter.leadPx).toBeGreaterThanOrEqual(18);
    expect(letter.leadPx).toBeLessThanOrEqual(22);
    expect(letter.ctaPx).toBeGreaterThanOrEqual(16);
    expect(letter.ctaPx).toBeLessThanOrEqual(22);
    expect(letter.urlPx).toBeLessThanOrEqual(20);
    expect(letter.localPx).toBeLessThanOrEqual(20);
    expect(letter.qrPx).toBeGreaterThanOrEqual(96);
    expect(letter.minHeadlinePx).toBeGreaterThanOrEqual(32);
    expect(letter.logoMaxHeightPx).toBeGreaterThanOrEqual(100);
  });

  it("grows on tabloid without jumping the 22px footer cap", () => {
    const tabloid = solidaritySupportChrome(1100);
    const letter = solidaritySupportChrome(850);
    expect(tabloid.qrPx).toBeGreaterThan(letter.qrPx);
    expect(tabloid.ctaPx).toBeLessThanOrEqual(22);
    expect(tabloid.localPx).toBeLessThanOrEqual(20);
  });

  it("Display type scale grows lead and compresses logo vs Dense", () => {
    const display = solidaritySupportChrome(850, { typeScale: 1.1 });
    const dense = solidaritySupportChrome(850, { typeScale: 0.88 });
    expect(display.leadPx).toBeGreaterThanOrEqual(dense.leadPx);
    expect(display.logoMaxHeightPx).toBeLessThan(dense.logoMaxHeightPx);
  });

  it("multi-line headlines yield more logo height for the type slot", () => {
    const one = solidaritySupportChrome(850, {
      typeScale: 1.1,
      headlineLineCount: 1,
    });
    const three = solidaritySupportChrome(850, {
      typeScale: 1.1,
      headlineLineCount: 3,
    });
    expect(three.logoMaxHeightPx).toBeLessThan(one.logoMaxHeightPx);
  });

  it("caps logo and QR by design height on landscape HD sheets", () => {
    const hd = solidaritySupportChrome(1920, {
      designHeightPx: 1080,
      typeScale: 1,
    });
    // Width share alone would be ~269px; height share (~130) must win.
    expect(hd.logoMaxHeightPx).toBeLessThanOrEqual(140);
    expect(hd.logoMaxHeightPx).toBeGreaterThanOrEqual(100);
    expect(hd.leadPx).toBeLessThanOrEqual(22);
    // Landscape must not use the portrait ~12.5% width QR (~240px).
    expect(hd.qrPx).toBeLessThanOrEqual(180);
    expect(hd.qrPx).toBeGreaterThanOrEqual(72);
  });
});
