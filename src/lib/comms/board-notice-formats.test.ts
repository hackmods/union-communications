import { describe, expect, it } from "vitest";
import {
  BOARD_NOTICE_FORMATS,
  boardNoticeExportPixelRatio,
  boardNoticePreviewHeightPx,
} from "./board-notice-formats";

describe("board-notice-formats", () => {
  it("uses fixed letter preview width at ~36 px/in", () => {
    expect(BOARD_NOTICE_FORMATS.letter.previewWidthPx).toBe(306);
    expect(boardNoticePreviewHeightPx(BOARD_NOTICE_FORMATS.letter)).toBe(396);
  });

  it("keeps tabloid taller than letter at the same px/in scale", () => {
    expect(BOARD_NOTICE_FORMATS.tabloid.previewWidthPx).toBeGreaterThan(
      BOARD_NOTICE_FORMATS.letter.previewWidthPx,
    );
    expect(boardNoticePreviewHeightPx(BOARD_NOTICE_FORMATS.tabloid)).toBeGreaterThan(
      boardNoticePreviewHeightPx(BOARD_NOTICE_FORMATS.letter),
    );
  });

  it("caps export pixel ratio between 2 and 4", () => {
    expect(boardNoticeExportPixelRatio(BOARD_NOTICE_FORMATS.letter)).toBe(4);
  });
});
