import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRIM_KIT,
  cornerLPolygons,
  cornerPositionAtIndex,
  cornerPositionById,
  railsUseEndCaps,
  resolveTrimFocus,
  selectedTrimPieces,
  toggleTrimPiece,
} from "./board-banner-layouts";

describe("trim kit", () => {
  it("defaults to continuous loop: top + side + bottom, no corners", () => {
    expect(selectedTrimPieces(DEFAULT_TRIM_KIT)).toEqual([
      "top",
      "side",
      "bottom",
    ]);
    expect(DEFAULT_TRIM_KIT.corner).toBe(false);
    expect(railsUseEndCaps(DEFAULT_TRIM_KIT)).toBe(true);
  });

  it("includes corner only when toggled on", () => {
    expect(
      selectedTrimPieces({
        top: true,
        side: true,
        bottom: true,
        corner: true,
      }),
    ).toEqual(["top", "side", "bottom", "corner"]);
    expect(
      selectedTrimPieces({
        top: false,
        side: true,
        bottom: false,
        corner: false,
      }),
    ).toEqual(["side"]);
  });

  it("drops rail end caps when Corner is in the kit", () => {
    expect(
      railsUseEndCaps({
        top: true,
        side: true,
        bottom: true,
        corner: true,
      }),
    ).toBe(false);
  });

  it("toggles pieces but refuses an empty kit", () => {
    const noTop = toggleTrimPiece(DEFAULT_TRIM_KIT, "top");
    expect(noTop.top).toBe(false);
    expect(noTop.side).toBe(true);

    const cornersOn = toggleTrimPiece(noTop, "corner");
    expect(cornersOn.corner).toBe(true);

    const onlyCorner = toggleTrimPiece(
      toggleTrimPiece(cornersOn, "side"),
      "bottom",
    );
    expect(selectedTrimPieces(onlyCorner)).toEqual(["corner"]);

    // Would empty the kit — ignored
    expect(toggleTrimPiece(onlyCorner, "corner")).toEqual(onlyCorner);
  });

  it("resolves focus to a still-selected piece", () => {
    expect(
      resolveTrimFocus(
        { top: false, side: false, bottom: true, corner: false },
        "top",
      ),
    ).toBe("bottom");
    expect(
      resolveTrimFocus(
        { top: true, side: false, bottom: false, corner: true },
        "corner",
      ),
    ).toBe("corner");
  });
});

describe("corner positions", () => {
  it("cycles packed tiles through all four upright corners", () => {
    expect(cornerPositionAtIndex(0)).toBe("topLeft");
    expect(cornerPositionAtIndex(1)).toBe("topRight");
    expect(cornerPositionAtIndex(2)).toBe("bottomLeft");
    expect(cornerPositionAtIndex(3)).toBe("bottomRight");
    expect(cornerPositionAtIndex(4)).toBe("topLeft");
    expect(cornerPositionAtIndex(-1)).toBe("bottomRight");
  });

  it("looks up corner labels", () => {
    expect(cornerPositionById("bottomRight").labelKey).toBe("cornerBottomRight");
  });

  it("gives each corner a distinct L that covers that joint", () => {
    const tl = cornerLPolygons("topLeft");
    const tr = cornerLPolygons("topRight");
    const bl = cornerLPolygons("bottomLeft");
    const br = cornerLPolygons("bottomRight");
    const all = [tl.primary, tr.primary, bl.primary, br.primary];
    expect(new Set(all).size).toBe(4);
    expect(tl.primary).toContain("0,0");
    expect(br.primary).toContain("100,100");
  });
});

