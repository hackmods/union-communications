import { describe, expect, it } from "vitest";
import {
  PRINT_PAGE_LEGACY_REFERENCE_PX,
  PRINT_PAGE_PX_PER_INCH,
  PRINT_PAGE_TARGET_WIDTH_PX,
  printPageExportPixelRatio,
  printPagePreviewHeightPx,
  printPagePreviewWidthPx,
} from "./print-page-formats";

describe("print-page-formats", () => {
  it("uses ~100 px/in so letter design width supports dense export", () => {
    expect(PRINT_PAGE_PX_PER_INCH).toBe(100);
    expect(printPagePreviewWidthPx(8.5)).toBe(850);
    expect(PRINT_PAGE_LEGACY_REFERENCE_PX).toBe(306);
  });

  it("derives preview height from aspect ratio", () => {
    const letter = {
      previewWidthPx: 850,
      widthInches: 8.5,
      heightInches: 11,
    };
    expect(printPagePreviewHeightPx(letter)).toBe(1100);
  });

  it("hits ~200 DPI letter target without OOM-tier magnification", () => {
    const ratio = printPageExportPixelRatio({
      previewWidthPx: 850,
      widthInches: 8.5,
    });
    expect(ratio).toBe(2);
    expect(850 * ratio).toBe(PRINT_PAGE_TARGET_WIDTH_PX);
  });

  it("still caps extreme ratios", () => {
    expect(
      printPageExportPixelRatio({
        previewWidthPx: 100,
        widthInches: 8.5,
      }),
    ).toBe(6);
  });
});
