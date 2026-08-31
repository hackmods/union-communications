import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { BRAND_KIT_KEY } from "@/lib/data/adapter";
import { readBrandKitLogoSnapshot } from "./read-logo-snapshot";

describe("readBrandKitLogoSnapshot", () => {
  it("returns official logo fields from localStorage", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
      },
    });

    storage.set(
      BRAND_KIT_KEY,
      JSON.stringify({
        ...DEFAULT_BRAND_KIT,
        useOfficialLogo: true,
        officialLogoVariant: "lockup",
        identityPackId: "opseu-caat-s",
        customLogoDataUrl: undefined,
        primaryColor: "#EA5A4F",
      }),
    );

    expect(readBrandKitLogoSnapshot()).toMatchObject({
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      customLogoDataUrl: undefined,
      identityPackId: "opseu-caat-s",
      primaryColor: "#EA5A4F",
    });

    vi.unstubAllGlobals();
  });
});
