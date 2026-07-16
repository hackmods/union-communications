import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRIM_KIT,
  resolveTrimFocus,
  selectedTrimPieces,
  toggleTrimRail,
} from "./board-banner-layouts";

describe("trim kit", () => {
  it("defaults to side + corner", () => {
    expect(selectedTrimPieces(DEFAULT_TRIM_KIT)).toEqual(["side", "corner"]);
  });

  it("always includes corner in the export list", () => {
    expect(
      selectedTrimPieces({ side: true, bottom: true, corner: true }),
    ).toEqual(["side", "bottom", "corner"]);
    expect(
      selectedTrimPieces({ side: false, bottom: true, corner: true }),
    ).toEqual(["bottom", "corner"]);
  });

  it("toggles rails but refuses to clear the last rail", () => {
    const withBottom = toggleTrimRail(DEFAULT_TRIM_KIT, "bottom");
    expect(withBottom).toEqual({ side: true, bottom: true, corner: true });

    const sideOnly = toggleTrimRail(withBottom, "side");
    expect(sideOnly).toEqual({ side: false, bottom: true, corner: true });

    // Would leave no rails — ignored
    expect(toggleTrimRail(sideOnly, "bottom")).toEqual(sideOnly);
  });

  it("resolves focus to a still-selected piece", () => {
    expect(
      resolveTrimFocus({ side: false, bottom: true, corner: true }, "side"),
    ).toBe("bottom");
    expect(
      resolveTrimFocus({ side: true, bottom: false, corner: true }, "corner"),
    ).toBe("corner");
  });
});
