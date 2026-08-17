import { describe, expect, it } from "vitest";
import {
  DEFAULT_QR_BOARD_FORMAT,
  QR_BOARD_FORMAT_ORDER,
  QR_BOARD_FORMATS,
  qrBoardExportPixelRatio,
  qrBoardGridColumns,
  qrBoardPlatePx,
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

  it("sizes 2-up letter plates larger than dense 6-up, and still scannable", () => {
    const letter = QR_BOARD_FORMATS.letter;
    const two = qrBoardPlatePx({
      format: letter,
      slotCount: 2,
      showUrl: true,
      includeBranding: true,
      paddingPx: 20,
    });
    const six = qrBoardPlatePx({
      format: letter,
      slotCount: 6,
      showUrl: true,
      includeBranding: true,
      paddingPx: 20,
    });
    expect(two).toBeGreaterThanOrEqual(80);
    expect(six).toBeGreaterThanOrEqual(36);
    expect(two).toBeGreaterThan(six);
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
