import { describe, expect, it } from "vitest";
import {
  BOARD_SHEET_FORMATS,
  DEFAULT_BOARD_SHEET,
  DEFAULT_EDGE_WIDTH,
  DEFAULT_STRIP_HEIGHT,
  EDGE_WIDTH_PRESETS,
  PACK_GAP_INCHES,
  STRIP_HEIGHT_PRESETS,
  bannersPerSheet,
  boardSheetFormats,
  cornersPerSheet,
  packCountForMode,
  sideColumnsPerSheet,
  usableSheetSize,
} from "./board-banner-formats";
import {
  BANNER_LAYOUTS,
  DEFAULT_BANNER_LAYOUT,
  DEFAULT_TRIM_PIECE,
  TRIM_PIECES,
  bannerLayoutUsesCallout,
} from "./board-banner-layouts";

describe("board-banner-formats sheets", () => {
  it("defaults to portrait letter", () => {
    expect(DEFAULT_BOARD_SHEET).toBe("letter");
    expect(BOARD_SHEET_FORMATS.letter.widthInches).toBe(8.5);
    expect(BOARD_SHEET_FORMATS.letter.heightInches).toBe(11);
  });

  it("lists letter then tabloid", () => {
    expect(boardSheetFormats().map((f) => f.id)).toEqual([
      "letter",
      "tabloid",
    ]);
  });

  it("defaults strip height 3.5 and edge 2", () => {
    expect(DEFAULT_STRIP_HEIGHT).toBe("standard");
    expect(STRIP_HEIGHT_PRESETS.standard.heightInches).toBe(3.5);
    expect(DEFAULT_EDGE_WIDTH).toBe("standard");
    expect(EDGE_WIDTH_PRESETS.standard.widthInches).toBe(2);
  });
});

describe("pack math", () => {
  const letter = BOARD_SHEET_FORMATS.letter;

  it("packs ~2–3 banner strips on letter at 3.5\"", () => {
    const n = bannersPerSheet(
      letter.heightInches,
      3.5,
      PACK_GAP_INCHES,
      letter.marginInches,
    );
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(3);
  });

  it("packs more compact strips than tall ones", () => {
    const compact = bannersPerSheet(
      letter.heightInches,
      STRIP_HEIGHT_PRESETS.compact.heightInches,
      PACK_GAP_INCHES,
      letter.marginInches,
    );
    const tall = bannersPerSheet(
      letter.heightInches,
      STRIP_HEIGHT_PRESETS.tall.heightInches,
      PACK_GAP_INCHES,
      letter.marginInches,
    );
    expect(compact).toBeGreaterThan(tall);
  });

  it("always returns at least one strip", () => {
    expect(bannersPerSheet(11, 20, PACK_GAP_INCHES, 0.35)).toBe(1);
    expect(sideColumnsPerSheet(8.5, 20, PACK_GAP_INCHES, 0.35)).toBe(1);
  });

  it("fits multiple 2\" side columns on letter", () => {
    const cols = sideColumnsPerSheet(
      letter.widthInches,
      2,
      PACK_GAP_INCHES,
      letter.marginInches,
    );
    expect(cols).toBeGreaterThanOrEqual(3);
    expect(cols).toBeLessThanOrEqual(5);
  });

  it("grids corner tiles on usable letter area", () => {
    const grid = cornersPerSheet(
      letter.widthInches,
      letter.heightInches,
      2,
      PACK_GAP_INCHES,
      letter.marginInches,
    );
    expect(grid.cols).toBeGreaterThanOrEqual(3);
    expect(grid.rows).toBeGreaterThanOrEqual(4);
    expect(grid.total).toBe(grid.cols * grid.rows);
  });

  it("packCountForMode matches helpers", () => {
    expect(
      packCountForMode({
        mode: "banner",
        trimPiece: "side",
        sheet: letter,
        stripHeightInches: 3.5,
        edgeWidthInches: 2,
      }),
    ).toBe(
      bannersPerSheet(
        letter.heightInches,
        3.5,
        PACK_GAP_INCHES,
        letter.marginInches,
      ),
    );

    expect(
      packCountForMode({
        mode: "trim",
        trimPiece: "side",
        sheet: letter,
        stripHeightInches: 3.5,
        edgeWidthInches: 2,
      }),
    ).toBe(
      sideColumnsPerSheet(
        letter.widthInches,
        2,
        PACK_GAP_INCHES,
        letter.marginInches,
      ),
    );

    expect(
      packCountForMode({
        mode: "trim",
        trimPiece: "top",
        sheet: letter,
        stripHeightInches: 3.5,
        edgeWidthInches: 2,
      }),
    ).toBe(
      bannersPerSheet(
        letter.heightInches,
        3.5,
        PACK_GAP_INCHES,
        letter.marginInches,
      ),
    );

    expect(
      packCountForMode({
        mode: "trim",
        trimPiece: "corner",
        sheet: letter,
        stripHeightInches: 3.5,
        edgeWidthInches: 2,
      }),
    ).toBe(
      cornersPerSheet(
        letter.widthInches,
        letter.heightInches,
        2,
        PACK_GAP_INCHES,
        letter.marginInches,
      ).total,
    );
  });

  it("usableSheetSize subtracts margins", () => {
    const u = usableSheetSize(letter);
    expect(u.widthInches).toBeCloseTo(8.5 - 0.7, 5);
    expect(u.heightInches).toBeCloseTo(11 - 0.7, 5);
  });
});

describe("board-banner-layouts", () => {
  it("defaults to slant callout banner and top trim focus", () => {
    expect(DEFAULT_BANNER_LAYOUT).toBe("slantCallout");
    expect(DEFAULT_TRIM_PIECE).toBe("top");
  });

  it("only slant callout uses the slogan field", () => {
    expect(bannerLayoutUsesCallout("slantCallout")).toBe(true);
    expect(bannerLayoutUsesCallout("centeredLockup")).toBe(false);
    expect(bannerLayoutUsesCallout("minimalStripe")).toBe(false);
  });

  it("exposes three banner layouts and four trim pieces", () => {
    expect(BANNER_LAYOUTS.map((l) => l.id)).toEqual([
      "slantCallout",
      "centeredLockup",
      "minimalStripe",
    ]);
    expect(TRIM_PIECES.map((p) => p.id)).toEqual([
      "top",
      "side",
      "bottom",
      "corner",
    ]);
  });
});
