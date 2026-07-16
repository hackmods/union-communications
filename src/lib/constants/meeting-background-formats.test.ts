import { describe, expect, it } from "vitest";
import {
  DEFAULT_MEETING_BACKGROUND_FORMAT,
  MEETING_BACKGROUND_FORMATS,
  exportPixelRatio,
  meetingBackgroundFormats,
} from "./meeting-background-formats";

describe("meeting-background-formats", () => {
  it("defaults to HD 1920×1080", () => {
    expect(DEFAULT_MEETING_BACKGROUND_FORMAT).toBe("hd");
    expect(MEETING_BACKGROUND_FORMATS.hd.exportWidthPx).toBe(1920);
    expect(MEETING_BACKGROUND_FORMATS.hd.exportHeightPx).toBe(1080);
  });

  it("lists HD then UHD", () => {
    expect(meetingBackgroundFormats().map((f) => f.id)).toEqual(["hd", "uhd"]);
  });

  it("keeps both formats at 16:9", () => {
    expect(MEETING_BACKGROUND_FORMATS.hd.aspect).toBe("aspect-[16/9]");
    expect(MEETING_BACKGROUND_FORMATS.uhd.aspect).toBe("aspect-[16/9]");
    expect(MEETING_BACKGROUND_FORMATS.uhd.exportWidthPx).toBe(3840);
    expect(MEETING_BACKGROUND_FORMATS.uhd.exportHeightPx).toBe(2160);
  });

  it("scales export from preview width to target pixels", () => {
    const node = { offsetWidth: 480 } as HTMLElement;
    expect(exportPixelRatio(node, MEETING_BACKGROUND_FORMATS.hd)).toBe(
      1920 / 480,
    );
    expect(exportPixelRatio(node, MEETING_BACKGROUND_FORMATS.uhd)).toBe(
      3840 / 480,
    );
    expect(exportPixelRatio(null, MEETING_BACKGROUND_FORMATS.hd)).toBe(2);
  });
});
