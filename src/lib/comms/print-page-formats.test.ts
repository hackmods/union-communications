import { describe, expect, it } from "vitest";
import {
  PRINT_PAGE_PX_PER_INCH,
  printPageExportPixelRatio,
  printPagePreviewHeightPx,
  printPagePreviewWidthPx,
} from "./print-page-formats";

describe("print-page-formats", () => {
  it("uses ~36 px/in for letter preview width", () => {
    expect(PRINT_PAGE_PX_PER_INCH).toBe(36);
    expect(printPagePreviewWidthPx(8.5)).toBe(306);
  });

  it("derives preview height from aspect ratio", () => {
    const letter = {
      previewWidthPx: 306,
      widthInches: 8.5,
      heightInches: 11,
    };
    expect(printPagePreviewHeightPx(letter)).toBe(396);
  });

  it("caps export pixel ratio between 2 and 4", () => {
    expect(
      printPageExportPixelRatio({
        previewWidthPx: 306,
        widthInches: 8.5,
      }),
    ).toBe(4);
  });
});
