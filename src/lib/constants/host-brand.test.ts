import { describe, expect, it, afterEach } from "vitest";
import { resolveHostBrandDefaults } from "@/lib/constants/host-brand";
import { PLATFORM_UNION_ORANGE } from "@/lib/constants/unionPresets";

const ENV_KEYS = [
  "NEXT_PUBLIC_BRAND_PRIMARY",
  "NEXT_PUBLIC_BRAND_SECONDARY",
  "NEXT_PUBLIC_BRAND_ACCENT",
  "NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER",
  "NEXT_PUBLIC_DEFAULT_SUB_TEXT",
  "NEXT_PUBLIC_DEFAULT_DIVISION_ID",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("resolveHostBrandDefaults", () => {
  it("uses the host-brand file when env is unset", () => {
    const defaults = resolveHostBrandDefaults({
      primaryColor: "#CE1126",
      secondaryColor: "#FFFFFF",
      accentColor: "#9B0D1C",
      localNumber: "79",
      subText: "Hospital Workers",
      divisionId: "hosp",
    });
    expect(defaults).toEqual({
      primaryColor: "#CE1126",
      secondaryColor: "#FFFFFF",
      accentColor: "#9B0D1C",
      localNumber: "79",
      subText: "Hospital Workers",
      divisionId: "hosp",
    });
  });

  it("lets env override the file", () => {
    process.env.NEXT_PUBLIC_BRAND_PRIMARY = "#003DA5";
    process.env.NEXT_PUBLIC_BRAND_SECONDARY = "#FFFFFF";
    process.env.NEXT_PUBLIC_BRAND_ACCENT = "#002868";
    process.env.NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER = "243";
    process.env.NEXT_PUBLIC_DEFAULT_SUB_TEXT = "CAAT Support";
    process.env.NEXT_PUBLIC_DEFAULT_DIVISION_ID = "caat";

    const defaults = resolveHostBrandDefaults({
      primaryColor: "#CE1126",
      secondaryColor: "#000000",
      accentColor: "#111111",
      localNumber: "1",
      subText: "Nope",
    });

    expect(defaults.primaryColor).toBe("#003DA5");
    expect(defaults.secondaryColor).toBe("#FFFFFF");
    expect(defaults.accentColor).toBe("#002868");
    expect(defaults.localNumber).toBe("243");
    expect(defaults.subText).toBe("CAAT Support");
    expect(defaults.divisionId).toBe("caat");
  });

  it("falls back to platform orange for missing/invalid colours", () => {
    const defaults = resolveHostBrandDefaults({
      primaryColor: "not-a-colour",
      secondaryColor: "#fff",
    });
    expect(defaults.primaryColor).toBe(PLATFORM_UNION_ORANGE.primary);
    expect(defaults.secondaryColor).toBe(PLATFORM_UNION_ORANGE.secondary);
    expect(defaults.accentColor).toBe(PLATFORM_UNION_ORANGE.accent);
  });
});
