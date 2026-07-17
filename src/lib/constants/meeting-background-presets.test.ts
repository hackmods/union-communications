import { describe, expect, it } from "vitest";
import {
  BOLD_MEETING_LAYOUTS,
  MEETING_BACKGROUND_PRESETS,
  MINIMAL_MEETING_LAYOUTS,
  designSetForLayout,
  getMeetingPresetById,
  headlineLines,
  isBoldLayout,
  isMinimalLayout,
  layoutForDesignSet,
  layoutsForDesignSet,
} from "./meeting-background-presets";

describe("meeting-background-presets", () => {
  it("ships punchy solidarity-style presets with bold + minimal layouts", () => {
    expect(MEETING_BACKGROUND_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const preset of MEETING_BACKGROUND_PRESETS) {
      expect(BOLD_MEETING_LAYOUTS).toContain(preset.layout);
      expect(MINIMAL_MEETING_LAYOUTS).toContain(preset.minimalLayout);
      expect(preset.headline.length).toBeGreaterThan(0);
    }
  });

  it("resolves presets by id", () => {
    expect(getMeetingPresetById("solidarity-forever")?.layout).toBe(
      "lower-third",
    );
    expect(getMeetingPresetById("solidarity-forever")?.minimalLayout).toBe(
      "footer",
    );
    expect(getMeetingPresetById("missing")).toBeUndefined();
  });

  it("filters layouts by design set", () => {
    expect(layoutsForDesignSet("bold")).toEqual(BOLD_MEETING_LAYOUTS);
    expect(layoutsForDesignSet("minimal")).toEqual(MINIMAL_MEETING_LAYOUTS);
    expect(isBoldLayout("corner")).toBe(true);
    expect(isMinimalLayout("masthead")).toBe(true);
    expect(designSetForLayout("bands")).toBe("bold");
    expect(designSetForLayout("rails")).toBe("minimal");
  });

  it("picks preset layout for the active design set", () => {
    const preset = getMeetingPresetById("organize")!;
    expect(layoutForDesignSet(preset, "bold")).toBe("corner");
    expect(layoutForDesignSet(preset, "minimal")).toBe("upper-stack");
  });

  it("splits stacked headlines on newlines", () => {
    expect(headlineLines("SOLIDARITY\nFOREVER")).toEqual([
      "SOLIDARITY",
      "FOREVER",
    ]);
  });
});
