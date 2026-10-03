import { describe, expect, it } from "vitest";
import { brandKitsMeaningfullyDiffer } from "@/lib/brand/brand-kit-diff";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";

describe("brandKitsMeaningfullyDiffer", () => {
  it("returns false for identical kits", () => {
    const a = normalizeBrandKit({ ...DEFAULT_BRAND_KIT });
    const b = normalizeBrandKit({ ...DEFAULT_BRAND_KIT });
    expect(brandKitsMeaningfullyDiffer(a, b)).toBe(false);
  });

  it("detects colour and logo differences", () => {
    const base = normalizeBrandKit({ ...DEFAULT_BRAND_KIT });
    expect(
      brandKitsMeaningfullyDiffer(
        { ...base, primaryColor: "#ABCDEF" },
        base,
      ),
    ).toBe(true);
    expect(
      brandKitsMeaningfullyDiffer(
        { ...base, customLogoDataUrl: "data:image/png;base64,abc" },
        base,
      ),
    ).toBe(true);
  });

  it("detects local number differences", () => {
    const base = normalizeBrandKit({ ...DEFAULT_BRAND_KIT });
    expect(
      brandKitsMeaningfullyDiffer(
        {
          ...base,
          local: { ...base.local, localNumber: "243" },
        },
        base,
      ),
    ).toBe(true);
  });
});
