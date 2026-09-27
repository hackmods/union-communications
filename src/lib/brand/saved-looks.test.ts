import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { UNION_PRESETS } from "@/lib/constants/unionPresets";
import { applySavedLook, captureSavedLook, capSavedLooksPerPreset, starterPaletteVariants } from "./saved-looks";

describe("saved Brand Kit Looks", () => {
  it("offers an additional editable starter for every non-OPSEU preset", () => {
    for (const preset of UNION_PRESETS.filter((item) => item.id !== "opseu")) {
      const variants = starterPaletteVariants(preset);
      expect(variants).toHaveLength(2);
      expect(variants[0].colors.primaryColor).not.toBe(variants[1].colors.primaryColor);
    }
  });

  it("captures colours, logo, and design treatment", () => {
    const kit = {
      ...DEFAULT_BRAND_KIT,
      designTreatment: "paper" as const,
      useOfficialLogo: true,
      officialLogoVariant: "mark" as const,
      identityPackId: "local-pack",
      customLogoDataUrl: "data:image/png;base64,dGVzdA==",
    };
    const look = captureSavedLook(kit, "council", " Council ");
    expect(look.name).toBe("Council");
    expect(look.primaryColor).toBe(kit.primaryColor);
    expect(look.designTreatment).toBe("paper");
    const patch = applySavedLook(look);
    expect(patch).toMatchObject({
      useOfficialLogo: true,
      officialLogoVariant: "mark",
      identityPackId: "local-pack",
      customLogoDataUrl: kit.customLogoDataUrl,
      designTreatment: "paper",
    });
  });
  it("leaves treatment alone when an older Look has no designTreatment", () => {
    const look = captureSavedLook(
      { ...DEFAULT_BRAND_KIT, designTreatment: undefined },
      "legacy",
      "Legacy",
    );
    delete (look as { designTreatment?: string }).designTreatment;
    const patch = applySavedLook(look);
    expect(patch).not.toHaveProperty("designTreatment");
  });

  it("caps Looks per union preset, not globally", () => {
    const base = captureSavedLook(
      { ...DEFAULT_BRAND_KIT, unionPresetId: "cupe" },
      "a",
      "A",
    );
    const cupe = Array.from({ length: 14 }, (_, i) => ({
      ...base,
      id: `cupe-${i}`,
      name: `CUPE ${i}`,
      unionPresetId: "cupe",
    }));
    const unifor = Array.from({ length: 3 }, (_, i) => ({
      ...base,
      id: `unifor-${i}`,
      name: `Unifor ${i}`,
      unionPresetId: "unifor",
    }));
    const capped = capSavedLooksPerPreset([...cupe, ...unifor]);
    expect(capped.filter((l) => l.unionPresetId === "cupe")).toHaveLength(12);
    expect(capped.filter((l) => l.unionPresetId === "unifor")).toHaveLength(3);
  });
});
