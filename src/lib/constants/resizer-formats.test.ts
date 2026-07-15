import { describe, expect, it } from "vitest";
import {
  CUSTOM_SIZE_MAX,
  CUSTOM_SIZE_MIN,
  DEFAULT_CUSTOM_HEIGHT,
  DEFAULT_CUSTOM_WIDTH,
  RESIZER_FORMATS,
  clampCustomSize,
  exportPixelRatio,
  platformResizerFormats,
  resolveResizerFormat,
} from "./resizer-formats";

describe("resizer-formats", () => {
  it("lists five platform presets in stable order", () => {
    expect(platformResizerFormats().map((f) => f.id)).toEqual([
      "facebookCover",
      "facebookPost",
      "instagramSquare",
      "instagramStory",
      "youtubeBanner",
    ]);
  });

  it("clamps custom sizes to inclusive bounds", () => {
    expect(clampCustomSize(16)).toBe(CUSTOM_SIZE_MIN);
    expect(clampCustomSize(10_000)).toBe(CUSTOM_SIZE_MAX);
    expect(clampCustomSize(1080.6)).toBe(1081);
    expect(clampCustomSize(Number.NaN)).toBe(CUSTOM_SIZE_MIN);
  });

  it("resolves custom and preset formats", () => {
    const custom = resolveResizerFormat("custom", 50, 5000);
    expect(custom).toMatchObject({
      id: "custom",
      width: CUSTOM_SIZE_MIN,
      height: CUSTOM_SIZE_MAX,
    });

    const ig = resolveResizerFormat(
      "instagramSquare",
      DEFAULT_CUSTOM_WIDTH,
      DEFAULT_CUSTOM_HEIGHT,
    );
    expect(ig.width).toBe(RESIZER_FORMATS.instagramSquare.width);
    expect(ig.height).toBe(RESIZER_FORMATS.instagramSquare.height);
  });

  it("scales export from preview width to catalog pixels", () => {
    const node = { offsetWidth: 540 } as HTMLElement;
    expect(exportPixelRatio(node, RESIZER_FORMATS.instagramSquare)).toBe(
      1080 / 540,
    );
    expect(exportPixelRatio(node, RESIZER_FORMATS.youtubeBanner)).toBe(
      2560 / 540,
    );
    expect(exportPixelRatio(null, RESIZER_FORMATS.facebookPost)).toBe(2);
  });
});
