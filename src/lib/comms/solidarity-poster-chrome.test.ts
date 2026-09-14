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
});
