import { describe, expect, it } from "vitest";
import {
  MEETING_BACKGROUND_PRESETS,
  getMeetingPresetById,
} from "./meeting-background-presets";

describe("meeting-background-presets", () => {
  it("ships low-key presets with face-safe layouts", () => {
    expect(MEETING_BACKGROUND_PRESETS.length).toBeGreaterThanOrEqual(5);
    for (const preset of MEETING_BACKGROUND_PRESETS) {
      expect(["corner", "lower-third", "side-panel", "watermark"]).toContain(
        preset.layout,
      );
      expect(["subtle", "balanced"]).toContain(preset.intensity);
    }
  });

  it("resolves presets by id", () => {
    expect(getMeetingPresetById("local-meeting")?.layout).toBe("lower-third");
    expect(getMeetingPresetById("missing")).toBeUndefined();
  });
});
