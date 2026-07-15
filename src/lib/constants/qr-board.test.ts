import { describe, expect, it } from "vitest";
import {
  DEFAULT_QR_BOARD_FORMAT,
  QR_BOARD_FORMAT_ORDER,
  QR_BOARD_FORMATS,
  qrBoardExportPixelRatio,
  qrBoardGridColumns,
} from "./qr-board-formats";
import {
  QR_BOARD_MAX_SLOTS,
  QR_BOARD_MIN_SLOTS,
  QR_BOARD_PRESETS,
  clampQrBoardSlotCount,
  getQrBoardPreset,
} from "./qr-board-presets";

describe("qr-board-formats", () => {
  it("defaults to letter", () => {
    expect(DEFAULT_QR_BOARD_FORMAT).toBe("letter");
    expect(QR_BOARD_FORMATS.letter.widthInches).toBe(8.5);
    expect(QR_BOARD_FORMATS.tabloid.widthInches).toBe(11);
  });

  it("lists every format in the order table", () => {
    for (const id of QR_BOARD_FORMAT_ORDER) {
      expect(QR_BOARD_FORMATS[id]).toBeDefined();
      expect(QR_BOARD_FORMATS[id].qrPixels).toBeGreaterThan(0);
      expect(QR_BOARD_FORMATS[id].previewWidthPx).toBeGreaterThan(0);
    }
  });

  it("chooses grid columns by slot count", () => {
    expect(qrBoardGridColumns(2)).toBe(2);
    expect(qrBoardGridColumns(3)).toBe(3);
    expect(qrBoardGridColumns(4)).toBe(2);
    expect(qrBoardGridColumns(5)).toBe(3);
    expect(qrBoardGridColumns(6)).toBe(3);
    expect(qrBoardGridColumns(7)).toBe(4);
    expect(qrBoardGridColumns(8)).toBe(4);
  });

  it("keeps export pixel ratio in a sensible band", () => {
    const letter = qrBoardExportPixelRatio(QR_BOARD_FORMATS.letter);
    const tabloid = qrBoardExportPixelRatio(QR_BOARD_FORMATS.tabloid);
    expect(letter).toBeGreaterThanOrEqual(2);
    expect(letter).toBeLessThanOrEqual(4);
    expect(tabloid).toBeGreaterThanOrEqual(2);
    expect(tabloid).toBeLessThanOrEqual(4);
  });
});

describe("qr-board-presets", () => {
  it("ships 2 / 4 / 6 board kits without union names", () => {
    expect(getQrBoardPreset("twoCampaigns")?.slots).toHaveLength(2);
    expect(getQrBoardPreset("coreLinks")?.slots).toHaveLength(4);
    expect(getQrBoardPreset("fullBoard")?.slots).toHaveLength(6);
    const blob = JSON.stringify(QR_BOARD_PRESETS);
    expect(blob).not.toMatch(/OPSEU/i);
    expect(blob).not.toMatch(/Local 243/i);
  });

  it("clamps slot counts to 2–8", () => {
    expect(clampQrBoardSlotCount(1)).toBe(QR_BOARD_MIN_SLOTS);
    expect(clampQrBoardSlotCount(4)).toBe(4);
    expect(clampQrBoardSlotCount(99)).toBe(QR_BOARD_MAX_SLOTS);
  });
});
