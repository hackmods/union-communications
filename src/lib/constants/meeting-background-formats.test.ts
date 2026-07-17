import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEETING_BACKGROUND_FORMAT,
  DEFAULT_PORTRAIT_MEETING_BACKGROUND_FORMAT,
  MEETING_BACKGROUND_FORMATS,
  exportPixelRatio,
  formatsForOrientation,
  matchingFormatForOrientation,
  meetingBackgroundFormats,
  orientationOf,
} from "./meeting-background-formats";

describe("meeting-background-formats", () => {
  it("defaults to HD 1920×1080", () => {
    expect(DEFAULT_MEETING_BACKGROUND_FORMAT).toBe("hd");
    expect(MEETING_BACKGROUND_FORMATS.hd.exportWidthPx).toBe(1920);
    expect(MEETING_BACKGROUND_FORMATS.hd.exportHeightPx).toBe(1080);
  });

  it("defaults portrait to 1080×1920", () => {
    expect(DEFAULT_PORTRAIT_MEETING_BACKGROUND_FORMAT).toBe("portrait-hd");
    expect(MEETING_BACKGROUND_FORMATS["portrait-hd"].exportWidthPx).toBe(1080);
    expect(MEETING_BACKGROUND_FORMATS["portrait-hd"].exportHeightPx).toBe(1920);
  });

  it("lists landscape then portrait formats", () => {
    expect(meetingBackgroundFormats().map((f) => f.id)).toEqual([
      "hd",
      "uhd",
      "portrait-hd",
      "portrait-uhd",
    ]);
  });

  it("keeps landscape at 16:9 and portrait at 9:16", () => {
    expect(MEETING_BACKGROUND_FORMATS.hd.aspect).toBe("aspect-[16/9]");
    expect(MEETING_BACKGROUND_FORMATS.uhd.aspect).toBe("aspect-[16/9]");
    expect(MEETING_BACKGROUND_FORMATS["portrait-hd"].aspect).toBe(
      "aspect-[9/16]",
    );
    expect(MEETING_BACKGROUND_FORMATS["portrait-uhd"].aspect).toBe(
      "aspect-[9/16]",
    );
    expect(MEETING_BACKGROUND_FORMATS.uhd.exportWidthPx).toBe(3840);
    expect(MEETING_BACKGROUND_FORMATS.uhd.exportHeightPx).toBe(2160);
    expect(MEETING_BACKGROUND_FORMATS["portrait-uhd"].exportWidthPx).toBe(2160);
    expect(MEETING_BACKGROUND_FORMATS["portrait-uhd"].exportHeightPx).toBe(
      3840,
    );
  });

  it("filters formats by orientation", () => {
    expect(formatsForOrientation("landscape").map((f) => f.id)).toEqual([
      "hd",
      "uhd",
    ]);
    expect(formatsForOrientation("portrait").map((f) => f.id)).toEqual([
      "portrait-hd",
      "portrait-uhd",
    ]);
  });

  it("resolves orientation and maps HD/UHD across orientations", () => {
    expect(orientationOf("hd")).toBe("landscape");
    expect(orientationOf(MEETING_BACKGROUND_FORMATS["portrait-hd"])).toBe(
      "portrait",
    );
    expect(matchingFormatForOrientation("hd", "portrait")).toBe("portrait-hd");
    expect(matchingFormatForOrientation("uhd", "portrait")).toBe(
      "portrait-uhd",
    );
    expect(matchingFormatForOrientation("portrait-hd", "landscape")).toBe("hd");
    expect(matchingFormatForOrientation("portrait-uhd", "landscape")).toBe(
      "uhd",
    );
    expect(matchingFormatForOrientation("hd", "landscape")).toBe("hd");
  });

  it("scales export from preview width to target pixels", () => {
    const node = { offsetWidth: 480 } as HTMLElement;
    expect(exportPixelRatio(node, MEETING_BACKGROUND_FORMATS.hd)).toBe(
      1920 / 480,
    );
    expect(exportPixelRatio(node, MEETING_BACKGROUND_FORMATS.uhd)).toBe(
      3840 / 480,
    );
    expect(
      exportPixelRatio(node, MEETING_BACKGROUND_FORMATS["portrait-hd"]),
    ).toBe(1080 / 480);
    expect(exportPixelRatio(null, MEETING_BACKGROUND_FORMATS.hd)).toBe(2);
  });
});
