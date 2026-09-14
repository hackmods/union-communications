import { describe, expect, it } from "vitest";
import {
  orgChartChromeScale,
  orgChartContentLoad,
  orgChartHeaderLogoScale,
  orgChartUsesCompactChrome,
} from "./fit";

describe("org chart fit", () => {
  it("counts band headings in poster load, not list load", () => {
    expect(
      orgChartContentLoad({ namedCount: 7, bandCount: 4, listLayout: false }),
    ).toBe(11);
    expect(
      orgChartContentLoad({ namedCount: 7, bandCount: 4, listLayout: true }),
    ).toBe(7);
  });

  it("does not use the pre-Core 306px letter ratio on an 850 sheet", () => {
    const sparse = orgChartChromeScale({
      designWidthPx: 850,
      namedCount: 4,
      bandCount: 2,
      listLayout: false,
    });
    const crowded = orgChartChromeScale({
      designWidthPx: 850,
      namedCount: 7,
      bandCount: 4,
      listLayout: false,
    });
    expect(sparse).toBeLessThan(850 / 306);
    expect(crowded).toBeLessThan(sparse);
    expect(crowded).toBeLessThan(1.2);
  });

  it("tightens header lockup and compact chrome as the roster grows", () => {
    expect(orgChartUsesCompactChrome(7)).toBe(false);
    expect(orgChartUsesCompactChrome(11)).toBe(true);
    expect(orgChartHeaderLogoScale(4)).toBe(1);
    expect(orgChartHeaderLogoScale(11)).toBeLessThan(orgChartHeaderLogoScale(4));
  });
});
