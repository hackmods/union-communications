import { describe, expect, it } from "vitest";
import {
  BOARD_NOTICE_FORMATS,
  boardNoticeExportPixelRatio,
  boardNoticePreviewHeightPx,
} from "./board-notice-formats";
import { PRINT_PAGE_TARGET_WIDTH_PX } from "@/lib/comms/print-page-formats";

describe("board-notice-formats", () => {
  it("uses ~100 px/in letter design width for denser export", () => {
    expect(BOARD_NOTICE_FORMATS.letter.previewWidthPx).toBe(850);
    expect(boardNoticePreviewHeightPx(BOARD_NOTICE_FORMATS.letter)).toBe(1100);
  });

  it("keeps tabloid taller than letter at the same px/in scale", () => {
    expect(BOARD_NOTICE_FORMATS.tabloid.previewWidthPx).toBeGreaterThan(
      BOARD_NOTICE_FORMATS.letter.previewWidthPx,
    );
    expect(boardNoticePreviewHeightPx(BOARD_NOTICE_FORMATS.tabloid)).toBeGreaterThan(
      boardNoticePreviewHeightPx(BOARD_NOTICE_FORMATS.letter),
    );
  });

  it("exports letter at the ~200 DPI browser-safe target width", () => {
    const ratio = boardNoticeExportPixelRatio(BOARD_NOTICE_FORMATS.letter);
    expect(ratio).toBe(2);
    expect(BOARD_NOTICE_FORMATS.letter.previewWidthPx * ratio).toBe(
      PRINT_PAGE_TARGET_WIDTH_PX,
    );
  });
});
