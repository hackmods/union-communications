import { describe, expect, it } from "vitest";
import {
  UNION_PRESETS,
  colorsFromUnionPreset,
  deriveAccentFromPrimary,
  getUnionPreset,
} from "./unionPresets";

describe("unionPresets", () => {
  it("exports the six expected unions", () => {
    expect(UNION_PRESETS.map((p) => p.id)).toEqual([
      "opseu",
      "cupe",
      "unifor",
      "usw",
      "ona",
      "psac",
    ]);
  });

  it("requires id, name, colours, and slogans on each preset", () => {
    for (const preset of UNION_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(preset.defaultSlogans.length).toBeGreaterThan(0);
    }
  });

  it("looks up presets by id", () => {
    expect(getUnionPreset("cupe")?.name).toBe("CUPE");
    expect(getUnionPreset("missing")).toBeUndefined();
  });

  it("derives accent and colour patches from a preset", () => {
    const opseu = getUnionPreset("opseu")!;
    const colors = colorsFromUnionPreset(opseu);
    expect(colors.primaryColor).toBe("#003DA5");
    expect(colors.secondaryColor).toBe("#FFFFFF");
    expect(colors.accentColor).toBe(deriveAccentFromPrimary("#003DA5"));
    expect(colors.accentColor).toMatch(/^#[0-9A-F]{6}$/);
  });
});
