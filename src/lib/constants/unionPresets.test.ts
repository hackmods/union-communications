import { describe, expect, it } from "vitest";
import {
  UNIONOPS_LOGOS,
  UNION_PRESETS,
  brandFieldsFromUnionPreset,
  colorsFromUnionPreset,
  deriveAccentFromPrimary,
  getUnionPreset,
  hasAttachedUnionLogos,
  resolvePresetLogos,
  type UnionBranding,
} from "./unionPresets";

describe("unionPresets", () => {
  it("exports the expected union presets including Other", () => {
    expect(UNION_PRESETS.map((p) => p.id)).toEqual([
      "opseu",
      "cupe",
      "unifor",
      "usw",
      "ona",
      "psac",
      "other",
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

  it("keeps OPSEU on the official pack and leaves other presets without attached logos", () => {
    const opseu = getUnionPreset("opseu")!;
    expect(opseu.logos?.useOfficialPack).toBe(true);
    expect(opseu.logos?.lockup).toContain("caat-opseu");
    expect(opseu.logos?.mark).toContain("caat-opseu");
    expect(hasAttachedUnionLogos(opseu.logos)).toBe(true);

    const cupe = getUnionPreset("cupe")!;
    expect(cupe.logos).toBeUndefined();
    expect(hasAttachedUnionLogos(cupe.logos)).toBe(false);
    expect(hasAttachedUnionLogos(getUnionPreset("other")?.logos)).toBe(false);
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
    expect(fields.membershipUrls?.length).toBeGreaterThan(0);
    expect(fields.membershipUrls?.[0].url).toContain("opseu.org");
  });

  it("maps other presets to UnionOps mark plus palette colours and sub-text", () => {
    const fields = brandFieldsFromUnionPreset(getUnionPreset("unifor")!);
    expect(fields.useOfficialLogo).toBe(false);
    expect(fields.customLogoDataUrl).toBe(UNIONOPS_LOGOS.mark);
    expect(fields.primaryColor).toBe("#ED1B2F");
    expect(fields.secondaryColor).toBe("#FFFFFF");
    expect(fields.unionPresetId).toBe("unifor");
    expect(fields.local?.subText).toBe("A union for everyone.");
    expect(fields.membershipUrls).toEqual([]);
  });

  it("clears OPSEU membership URLs when switching to a non-seed preset", () => {
    const unifor = brandFieldsFromUnionPreset(getUnionPreset("unifor")!);
    expect(JSON.stringify(unifor.membershipUrls ?? []).toLowerCase()).not.toContain(
      "opseu",
    );
  });

  it("applies published preset colours and taglines", () => {
    expect(getUnionPreset("cupe")).toMatchObject({
      primaryColor: "#E5007D",
      secondaryColor: "#FFFFFF",
      defaultSlogans: ["On the front line."],
    });
    expect(getUnionPreset("usw")).toMatchObject({
      primaryColor: "#002A5C",
      secondaryColor: "#FFC72C",
      defaultSlogans: ["Unity and Strength for Workers."],
    });
    expect(getUnionPreset("ona")).toMatchObject({
      primaryColor: "#003865",
      secondaryColor: "#FFD100",
      defaultSlogans: ["Stand up, speak out."],
    });
    expect(getUnionPreset("psac")).toMatchObject({
      primaryColor: "#E31837",
      secondaryColor: "#FFFFFF",
      defaultSlogans: ["Here for Canada."],
    });
    expect(getUnionPreset("opseu")?.defaultSlogans).toEqual([
      "Educate. Advocate. Organize.",
    ]);
    expect(getUnionPreset("other")).toMatchObject({
      name: "Other",
      primaryColor: "#C2410C",
      secondaryColor: "#FFFFFF",
      accentColor: "#9A3412",
      logoText: "UO",
      defaultSlogans: ["Solidarity."],
    });
  });

  it("maps Other preset to UnionOps palette and mark", () => {
    const fields = brandFieldsFromUnionPreset(getUnionPreset("other")!);
    expect(fields.useOfficialLogo).toBe(false);
    expect(fields.customLogoDataUrl).toBe(UNIONOPS_LOGOS.mark);
    expect(fields.primaryColor).toBe("#C2410C");
    expect(fields.secondaryColor).toBe("#FFFFFF");
    expect(fields.accentColor).toBe("#9A3412");
    expect(fields.logoText).toBe("UO");
    expect(fields.unionPresetId).toBe("other");
    expect(fields.local?.subText).toBe("Solidarity.");
  });

  it("detects attached logo packs vs UnionOps fallbacks", () => {
    expect(
      hasAttachedUnionLogos({
        lockup: "/assets/unions/cupe/logo.svg",
        mark: "/assets/unions/cupe/logo-mark.svg",
      }),
    ).toBe(true);
    expect(
      hasAttachedUnionLogos({
        lockup: UNIONOPS_LOGOS.lockup,
        mark: UNIONOPS_LOGOS.mark,
      }),
    ).toBe(false);
    expect(hasAttachedUnionLogos({ lockup: "/only-lockup.svg" })).toBe(false);
    expect(hasAttachedUnionLogos(undefined)).toBe(false);
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
    expect(fields.customLogoDataUrl).toBe(UNIONOPS_LOGOS.mark);
    expect(fields.unionPresetId).toBe("bare");
    expect(fields.local?.subText).toBe("Hello");
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
