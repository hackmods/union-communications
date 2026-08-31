import { describe, expect, it } from "vitest";
import {
  FLYER_FORMATS,
  flyerExportPixelRatio,
  flyerPreviewHeightPx,
} from "@/lib/comms/flyer-formats";

describe("flyer-formats", () => {
  it("uses fixed letter preview width at ~36 px/in", () => {
    expect(FLYER_FORMATS.letter.previewWidthPx).toBe(306);
    expect(flyerPreviewHeightPx(FLYER_FORMATS.letter)).toBe(396);
  });

  it("scales half-letter narrower than letter", () => {
    expect(FLYER_FORMATS.halfLetter.previewWidthPx).toBeLessThan(
      FLYER_FORMATS.letter.previewWidthPx,
    );
  });

  it("caps export pixel ratio between 2 and 4", () => {
    expect(flyerExportPixelRatio(FLYER_FORMATS.letter)).toBe(4);
  });
});
