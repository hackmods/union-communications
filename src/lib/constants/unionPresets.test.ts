import { describe, expect, it } from "vitest";
import {
  UNIONOPS_LOGOS,
  UNION_PRESETS,
  brandFieldsFromUnionPreset,
  colorsFromUnionPreset,
  deriveAccentFromPrimary,
  getUnionPreset,
  resolvePresetLogos,
  type UnionBranding,
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

  it("keeps OPSEU on the official pack and others on starter wordmarks", () => {
    const opseu = getUnionPreset("opseu")!;
    expect(opseu.logos?.useOfficialPack).toBe(true);
    expect(opseu.logos?.lockup).toContain("caat-opseu");
    expect(opseu.logos?.mark).toContain("caat-opseu");

    const cupe = getUnionPreset("cupe")!;
    expect(cupe.logos?.useOfficialPack).toBeFalsy();
    expect(cupe.logos?.lockup).toContain("/unions/cupe/");
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

  it("maps OPSEU preset to official logo fields", () => {
    const fields = brandFieldsFromUnionPreset(getUnionPreset("opseu")!);
    expect(fields.useOfficialLogo).toBe(true);
    expect(fields.officialLogoVariant).toBe("lockup");
    expect(fields.customLogoDataUrl).toBeUndefined();
  });

  it("maps other presets to starter logo paths", () => {
    const fields = brandFieldsFromUnionPreset(getUnionPreset("unifor")!);
    expect(fields.useOfficialLogo).toBe(false);
    expect(fields.customLogoDataUrl).toBe("/assets/unions/unifor/logo.svg");
  });

  it("falls back to UnionOps when logos are missing or empty", () => {
    const bare: UnionBranding = {
      id: "bare",
      name: "Bare",
      primaryColor: "#111111",
      secondaryColor: "#FFFFFF",
      defaultSlogans: ["Hello"],
    };
    expect(resolvePresetLogos(bare.logos)).toEqual({
      lockup: UNIONOPS_LOGOS.lockup,
      mark: UNIONOPS_LOGOS.mark,
      markOnDark: UNIONOPS_LOGOS.markOnDark,
      useOfficialPack: false,
    });

    expect(
      resolvePresetLogos({
        useOfficialPack: true,
        lockup: "  ",
        mark: "",
      }),
    ).toMatchObject({
      lockup: UNIONOPS_LOGOS.lockup,
      mark: UNIONOPS_LOGOS.mark,
      useOfficialPack: false,
    });

    const fields = brandFieldsFromUnionPreset(bare);
    expect(fields.useOfficialLogo).toBe(false);
    expect(fields.customLogoDataUrl).toBe(UNIONOPS_LOGOS.lockup);
  });

  it("fills partial logo packs with UnionOps for missing slots", () => {
    const resolved = resolvePresetLogos({
      lockup: "/assets/unions/cupe/logo.svg",
    });
    expect(resolved.lockup).toBe("/assets/unions/cupe/logo.svg");
    expect(resolved.mark).toBe(UNIONOPS_LOGOS.mark);
    expect(resolved.markOnDark).toBe(UNIONOPS_LOGOS.markOnDark);
  });
});
