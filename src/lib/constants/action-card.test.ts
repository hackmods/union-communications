import { describe, expect, it } from "vitest";
import {
  ACTION_CARD_PRESETS,
  getActionCardPreset,
} from "./action-card-presets";

describe("action-card-presets", () => {
  it("ships petition-style presets without union names or baked-in URLs", () => {
    expect(ACTION_CARD_PRESETS.length).toBeGreaterThanOrEqual(4);
    const blob = JSON.stringify(ACTION_CARD_PRESETS);
    expect(blob).not.toMatch(/OPSEU/i);
    expect(blob).not.toMatch(/Local 243/i);
    for (const preset of ACTION_CARD_PRESETS) {
      expect(preset.defaultUrl).toBe("");
    }
  });

  it("resolves presets by id", () => {
    expect(getActionCardPreset("signPetition")?.bgMode).toBe("accentBar");
    expect(getActionCardPreset("missing")).toBeUndefined();
  });
});
