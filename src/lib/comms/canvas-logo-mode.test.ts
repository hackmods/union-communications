import { describe, expect, it } from "vitest";
import {
  defaultLogoMode,
  defaultShowLocalNumber,
  logoModeFromLegacyBranding,
  normalizeLogoMode,
  resolveLogoVariant,
  showCanvasLogo,
} from "@/lib/comms/canvas-logo-mode";

describe("canvas-logo-mode", () => {
  it("defaults lockup when brand is established", () => {
    expect(defaultLogoMode(true)).toBe("lockup");
    expect(defaultLogoMode(false)).toBe("none");
    expect(defaultShowLocalNumber()).toBe(true);
  });

  it("maps legacy includeBranding", () => {
    expect(logoModeFromLegacyBranding(true)).toBe("lockup");
    expect(logoModeFromLegacyBranding(false)).toBe("none");
    expect(logoModeFromLegacyBranding(undefined, "mark")).toBe("mark");
  });

  it("normalizes logo mode from draft shapes", () => {
    expect(
      normalizeLogoMode({ logoMode: "mark", includeBranding: false }, true),
    ).toBe("mark");
    expect(normalizeLogoMode({ includeBranding: true }, false)).toBe("lockup");
    expect(normalizeLogoMode({}, true)).toBe("lockup");
  });

  it("resolves variants with optional auto-mark", () => {
    expect(resolveLogoVariant("none")).toBeUndefined();
    expect(resolveLogoVariant("lockup")).toBe("lockup");
    expect(resolveLogoVariant("lockup", { preferMark: true })).toBe("mark");
    expect(resolveLogoVariant("mark")).toBe("mark");
    expect(showCanvasLogo("none")).toBe(false);
    expect(showCanvasLogo("lockup")).toBe(true);
  });
});
