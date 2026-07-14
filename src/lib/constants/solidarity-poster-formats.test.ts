import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIGITAL_FORMAT,
  DEFAULT_PRINT_FORMAT,
  SOLIDARITY_POSTER_FORMATS,
  defaultFormatForMedium,
  exportPixelRatio,
  formatsForMedium,
  supportsPdf,
} from "./solidarity-poster-formats";

describe("solidarity-poster-formats", () => {
  it("defaults print to letter and digital to horizontal", () => {
    expect(defaultFormatForMedium("print")).toBe(DEFAULT_PRINT_FORMAT);
    expect(defaultFormatForMedium("digital")).toBe(DEFAULT_DIGITAL_FORMAT);
  });

  it("lists print and digital sizes separately", () => {
    expect(formatsForMedium("print").map((f) => f.id)).toEqual([
      "letter",
      "tabloid",
    ]);
    expect(formatsForMedium("digital").map((f) => f.id)).toEqual([
      "horizontal",
      "vertical",
    ]);
  });

  it("allows PDF only for print formats with inch dimensions", () => {
    expect(supportsPdf(SOLIDARITY_POSTER_FORMATS.letter)).toBe(true);
    expect(supportsPdf(SOLIDARITY_POSTER_FORMATS.tabloid)).toBe(true);
    expect(supportsPdf(SOLIDARITY_POSTER_FORMATS.horizontal)).toBe(false);
    expect(supportsPdf(SOLIDARITY_POSTER_FORMATS.vertical)).toBe(false);
  });

  it("scales digital export from preview width to target pixels", () => {
    const node = { offsetWidth: 480 } as HTMLElement;
    expect(exportPixelRatio(node, SOLIDARITY_POSTER_FORMATS.horizontal)).toBe(
      3840 / 480,
    );
    expect(exportPixelRatio(node, SOLIDARITY_POSTER_FORMATS.vertical)).toBe(
      1080 / 480,
    );
    expect(exportPixelRatio(node, SOLIDARITY_POSTER_FORMATS.letter)).toBe(2);
  });
});
