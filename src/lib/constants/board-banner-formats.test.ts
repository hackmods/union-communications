import { describe, expect, it } from "vitest";
import {
  BOARD_BANNER_FORMATS,
  DEFAULT_BOARD_BANNER_FORMAT,
  boardBannerFormats,
  trimFilenameStem,
} from "./board-banner-formats";
import {
  BANNER_LAYOUTS,
  DEFAULT_BANNER_LAYOUT,
  DEFAULT_TRIM_PIECE,
  TRIM_PIECES,
  bannerLayoutUsesCallout,
} from "./board-banner-layouts";

describe("board-banner-formats", () => {
  it("defaults to letter landscape", () => {
    expect(DEFAULT_BOARD_BANNER_FORMAT).toBe("letter");
    expect(BOARD_BANNER_FORMATS.letter.widthInches).toBe(11);
    expect(BOARD_BANNER_FORMATS.letter.heightInches).toBe(8.5);
  });

  it("lists letter then tabloid", () => {
    expect(boardBannerFormats().map((f) => f.id)).toEqual([
      "letter",
      "tabloid",
    ]);
  });

  it("builds trim filename stems per piece and format", () => {
    expect(trimFilenameStem(BOARD_BANNER_FORMATS.letter, "side")).toBe(
      "board-trim-side-letter",
    );
    expect(trimFilenameStem(BOARD_BANNER_FORMATS.tabloid, "corner")).toBe(
      "board-trim-corner-tabloid",
    );
  });
});

describe("board-banner-layouts", () => {
  it("defaults to slant callout banner and side trim", () => {
    expect(DEFAULT_BANNER_LAYOUT).toBe("slantCallout");
    expect(DEFAULT_TRIM_PIECE).toBe("side");
  });

  it("only slant callout uses the slogan field", () => {
    expect(bannerLayoutUsesCallout("slantCallout")).toBe(true);
    expect(bannerLayoutUsesCallout("centeredLockup")).toBe(false);
    expect(bannerLayoutUsesCallout("minimalStripe")).toBe(false);
  });

  it("exposes three banner layouts and three trim pieces", () => {
    expect(BANNER_LAYOUTS.map((l) => l.id)).toEqual([
      "slantCallout",
      "centeredLockup",
      "minimalStripe",
    ]);
    expect(TRIM_PIECES.map((p) => p.id)).toEqual(["side", "bottom", "corner"]);
  });
});
