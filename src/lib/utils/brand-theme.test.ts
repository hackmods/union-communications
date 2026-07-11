import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { isBrandThemeEstablished } from "./brand-theme";

describe("isBrandThemeEstablished", () => {
  it("is false for default kit without onboarding", () => {
    expect(isBrandThemeEstablished(DEFAULT_BRAND_KIT, false)).toBe(false);
  });

  it("is true when onboarding is complete", () => {
    expect(isBrandThemeEstablished(DEFAULT_BRAND_KIT, true)).toBe(true);
  });

  it("is true when official logo is enabled", () => {
    expect(
      isBrandThemeEstablished(
        { ...DEFAULT_BRAND_KIT, useOfficialLogo: true },
        false,
      ),
    ).toBe(true);
  });

  it("is true when custom logo is set", () => {
    expect(
      isBrandThemeEstablished(
        { ...DEFAULT_BRAND_KIT, customLogoDataUrl: "data:image/png;base64,abc" },
        false,
      ),
    ).toBe(true);
  });

  it("is true when local number is set", () => {
    expect(
      isBrandThemeEstablished(
        {
          ...DEFAULT_BRAND_KIT,
          local: { ...DEFAULT_BRAND_KIT.local, localNumber: "100" },
        },
        false,
      ),
    ).toBe(true);
  });
});
