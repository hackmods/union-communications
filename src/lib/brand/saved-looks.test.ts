import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { UNION_PRESETS } from "@/lib/constants/unionPresets";
import { applySavedLook, captureSavedLook, starterPaletteVariants } from "./saved-looks";

describe("saved Brand Kit Looks", () => {
  it("offers an additional editable starter for every non-OPSEU preset", () => {
    for (const preset of UNION_PRESETS.filter((item) => item.id !== "opseu")) {
      const variants = starterPaletteVariants(preset);
      expect(variants).toHaveLength(2);
      expect(variants[0].colors.primaryColor).not.toBe(variants[1].colors.primaryColor);
    }
  });

  it("captures colours and logo choice without changing the design treatment", () => {
    const kit = { ...DEFAULT_BRAND_KIT, designTreatment: "paper" as const,
      useOfficialLogo: true, officialLogoVariant: "mark" as const,
      identityPackId: "local-pack", customLogoDataUrl: "data:image/png;base64,dGVzdA==" };
    const look = captureSavedLook(kit, "council", " Council ");
    expect(look.name).toBe("Council");
    expect(look.primaryColor).toBe(kit.primaryColor);
    const patch = applySavedLook(look);
    expect(patch).not.toHaveProperty("designTreatment");
    expect({ ...kit, ...patch }.designTreatment).toBe("paper");
    expect(patch).toMatchObject({ useOfficialLogo: true, officialLogoVariant: "mark",
      identityPackId: "local-pack", customLogoDataUrl: kit.customLogoDataUrl });
  });
});
