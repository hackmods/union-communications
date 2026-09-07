import { describe, expect, it } from "vitest";
import {
  FLYER_FORMATS,
  flyerExportPixelRatio,
  flyerPreviewHeightPx,
} from "@/lib/comms/flyer-formats";
import { PRINT_PAGE_TARGET_WIDTH_PX } from "@/lib/comms/print-page-formats";

describe("flyer-formats", () => {
  it("uses ~100 px/in letter design width for denser export", () => {
    expect(FLYER_FORMATS.letter.previewWidthPx).toBe(850);
    expect(flyerPreviewHeightPx(FLYER_FORMATS.letter)).toBe(1100);
  });

  it("scales half-letter narrower than letter", () => {
    expect(FLYER_FORMATS.halfLetter.previewWidthPx).toBeLessThan(
      FLYER_FORMATS.letter.previewWidthPx,
    );
  });

  it("exports letter at the ~200 DPI browser-safe target width", () => {
    const ratio = flyerExportPixelRatio(FLYER_FORMATS.letter);
    expect(ratio).toBe(2);
    expect(FLYER_FORMATS.letter.previewWidthPx * ratio).toBe(
      PRINT_PAGE_TARGET_WIDTH_PX,
    );
  });
});
