import { describe, expect, it } from "vitest";
import {
  MEETING_BACKGROUND_PRESETS,
  getMeetingPresetById,
  headlineLines,
} from "./meeting-background-presets";

describe("meeting-background-presets", () => {
  it("ships punchy solidarity-style presets with face-safe layouts", () => {
    expect(MEETING_BACKGROUND_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const preset of MEETING_BACKGROUND_PRESETS) {
      expect(["corner", "lower-third", "side-panel", "bands"]).toContain(
        preset.layout,
      );
      expect(preset.headline.length).toBeGreaterThan(0);
    }
  });

  it("resolves presets by id", () => {
    expect(getMeetingPresetById("solidarity-forever")?.layout).toBe(
      "lower-third",
    );
    expect(getMeetingPresetById("missing")).toBeUndefined();
  });

  it("splits stacked headlines on newlines", () => {
    expect(headlineLines("SOLIDARITY\nFOREVER")).toEqual([
      "SOLIDARITY",
      "FOREVER",
    ]);
  });
});
