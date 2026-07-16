import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRIM_KIT,
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
