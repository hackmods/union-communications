import { describe, expect, it } from "vitest";
import {
  DEFAULT_QR_CARD_SIZE,
  QR_CARD_SIZE_ORDER,
  QR_CARD_SIZES,
} from "./qr-card-sizes";
import { QR_CARD_PRESETS, getQrCardPreset } from "./qr-card-presets";

describe("qr-card-sizes", () => {
  it("defaults to quarter letter for 4-up printing", () => {
    expect(DEFAULT_QR_CARD_SIZE).toBe("quarter");
    expect(QR_CARD_SIZES.quarter.widthInches).toBe(4.25);
    expect(QR_CARD_SIZES.quarter.heightInches).toBe(5.5);
  });

  it("lists every size in the order table", () => {
    for (const id of QR_CARD_SIZE_ORDER) {
      expect(QR_CARD_SIZES[id]).toBeDefined();
      expect(QR_CARD_SIZES[id].qrPixels).toBeGreaterThan(0);
    }
  });
});

describe("qr-card-presets", () => {
  it("ships attention-grabber presets without union names", () => {
    expect(QR_CARD_PRESETS.length).toBeGreaterThanOrEqual(5);
    const blob = JSON.stringify(QR_CARD_PRESETS);
    expect(blob).not.toMatch(/OPSEU/i);
    expect(blob).not.toMatch(/Local 243/i);
  });

  it("resolves presets by id", () => {
    expect(getQrCardPreset("esa")?.defaultUrl).toContain("ontario.ca");
    expect(getQrCardPreset("missing")).toBeUndefined();
  });
});
