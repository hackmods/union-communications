import { describe, expect, it } from "vitest";
import {
  UNION_PRESETS,
  brandFieldsFromUnionPreset,
  getUnionPreset,
} from "./unionPresets";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

/**
 * Sourced hex values — see `docs/audit/union-preset-brand-audit.md`.
 * Change preset colours and this table together.
 */
export const AUDITED_PRESET_COLORS: Record<
  string,
  { primary: string; secondary: string; accent?: string }
> = {
  opseu: { primary: "#003DA5", secondary: "#FFFFFF", accent: "#002868" },
  cupe: { primary: "#AF0061", secondary: "#FFFFFF" },
  unifor: { primary: "#C31A1A", secondary: "#FFFFFF", accent: "#005EB8" },
  usw: { primary: "#002C65", secondary: "#FFC03F" },
  ona: { primary: "#003865", secondary: "#FFD100" },
  psac: { primary: "#C0311A", secondary: "#FFFFFF" },
  other: { primary: "#C2410C", secondary: "#FFFFFF", accent: "#9A3412" },
};

describe("union preset brand audit", () => {
  it("matches audited hex values for every shipped preset", () => {
    for (const preset of UNION_PRESETS) {
      const audited = AUDITED_PRESET_COLORS[preset.id];
      expect(audited, `missing audit row for ${preset.id}`).toBeTruthy();
      expect(preset.primaryColor.toUpperCase()).toBe(audited!.primary);
      expect(preset.secondaryColor.toUpperCase()).toBe(audited!.secondary);
      if (audited!.accent) {
        expect((preset.accentColor ?? "").toUpperCase()).toBe(audited!.accent);
      }
    }
  });

  it("applies Unifor official red and blue accent on preset apply", () => {
    const fields = brandFieldsFromUnionPreset(getUnionPreset("unifor")!);
    expect(fields.primaryColor).toBe("#C31A1A");
    expect(fields.accentColor).toBe("#005EB8");
  });

  it("seeds canvas fonts for CUPE, Unifor, USW, and PSAC presets", () => {
    for (const id of ["cupe", "usw", "psac"] as const) {
      const fields = brandFieldsFromUnionPreset(getUnionPreset(id)!);
      expect(fields.canvas?.headlineFontId).toBeTruthy();
      expect(fields.canvas?.bodyFontId).toBe("sourceSans");
    }
    const unifor = brandFieldsFromUnionPreset(getUnionPreset("unifor")!);
    expect(unifor.canvas?.headlineFontId).toBe("lato");
    expect(unifor.canvas?.bodyFontId).toBe("lato");
  });

  it("ships presetSlogans i18n for every union preset id", () => {
    const enSlogans = en.brandKit.presetSlogans as Record<
      string,
      { items: string[] }
    >;
    const frSlogans = fr.brandKit.presetSlogans as Record<
      string,
      { items: string[] }
    >;
    for (const preset of UNION_PRESETS) {
      expect(enSlogans[preset.id]?.items?.length).toBeGreaterThan(0);
      expect(frSlogans[preset.id]?.items?.length).toBeGreaterThan(0);
      expect(enSlogans[preset.id].items[0]).toBe(preset.defaultSlogans[0]);
    }
  });
});
