import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import {
  applyBrandKitOverlay,
  computePersonalOverlay,
  overlayHasContent,
  resolveEffectiveBrandKit,
} from "@/lib/brand/resolve-effective-brand-kit";
import { canPublishLocalBrand } from "@/lib/brand/local-brand-access";

const base = normalizeBrandKit({
  ...DEFAULT_BRAND_KIT,
  primaryColor: "#111111",
  secondaryColor: "#222222",
  accentColor: "#333333",
  local: { ...DEFAULT_BRAND_KIT.local, localNumber: "7" },
});

describe("resolveEffectiveBrandKit", () => {
  it("returns null when both layers empty", () => {
    expect(resolveEffectiveBrandKit(null, null)).toBeNull();
    expect(resolveEffectiveBrandKit(null, {})).toBeNull();
  });

  it("returns local shared when overlay empty", () => {
    const effective = resolveEffectiveBrandKit(base, {});
    expect(effective?.primaryColor).toBe("#111111");
    expect(effective?.local.localNumber).toBe("7");
  });

  it("merges personal overlay over local shared", () => {
    const effective = resolveEffectiveBrandKit(base, {
      signatureName: "Alex Steward",
      primaryColor: "#ABCDEF",
    });
    expect(effective?.signatureName).toBe("Alex Steward");
    expect(effective?.primaryColor).toBe("#ABCDEF");
    expect(effective?.local.localNumber).toBe("7");
  });

  it("uses overlay alone when no local shared yet", () => {
    const effective = resolveEffectiveBrandKit(null, {
      ...base,
      signatureName: "Solo",
    });
    expect(effective?.signatureName).toBe("Solo");
    expect(effective?.primaryColor).toBe("#111111");
  });
});

describe("computePersonalOverlay", () => {
  it("stores full kit when no local shared exists", () => {
    const overlay = computePersonalOverlay(null, base);
    expect(overlay.primaryColor).toBe("#111111");
    expect(overlay.local?.localNumber).toBe("7");
  });

  it("stores only diffs against local shared", () => {
    const submitted = applyBrandKitOverlay(base, {
      signatureName: "Sam",
      primaryColor: "#FF0000",
    });
    const overlay = computePersonalOverlay(base, submitted);
    expect(overlay.signatureName).toBe("Sam");
    expect(overlay.primaryColor).toBe("#FF0000");
    expect(overlay.secondaryColor).toBeUndefined();
  });

  it("always keeps personal signature fields when set", () => {
    const submitted = applyBrandKitOverlay(base, {
      signatureName: "Sam",
      signatureTitle: "Steward",
    });
    const overlay = computePersonalOverlay(base, submitted);
    expect(overlay.signatureName).toBe("Sam");
    expect(overlay.signatureTitle).toBe("Steward");
  });
});

describe("overlayHasContent", () => {
  it("detects meaningful overlay keys", () => {
    expect(overlayHasContent({})).toBe(false);
    expect(overlayHasContent({ signatureName: "" })).toBe(false);
    expect(overlayHasContent({ signatureName: "A" })).toBe(true);
  });
});

describe("canPublishLocalBrand", () => {
  it("allows local officers and platform admins only", () => {
    expect(canPublishLocalBrand(["local_steward"])).toBe(false);
    expect(canPublishLocalBrand(["local_president"])).toBe(true);
    expect(canPublishLocalBrand(["platform_admin"])).toBe(true);
    expect(canPublishLocalBrand([])).toBe(false);
  });
});
