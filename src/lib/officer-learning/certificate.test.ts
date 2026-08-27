import { describe, expect, it } from "vitest";
import { certificateLogoPlacement } from "./certificate";
import { transparentPngBytes } from "@/lib/export/brand-logo-bytes";
import { certificateBrandLogoPlacement } from "@/lib/export/text-pdf-layout";

describe("certificateLogoPlacement", () => {
  it("returns null without logo bytes", () => {
    expect(certificateLogoPlacement(null)).toBeNull();
    expect(certificateLogoPlacement(undefined)).toBeNull();
    expect(
      certificateLogoPlacement({
        bytes: new Uint8Array(),
        extension: "png",
        widthPx: 100,
        heightPx: 40,
        src: "",
      }),
    ).toBeNull();
  });

  it("places a scaled logo top-left when bytes exist (legacy single-logo layout)", () => {
    const bytes = transparentPngBytes();
    const placement = certificateLogoPlacement({
      bytes,
      extension: "png",
      widthPx: 240,
      heightPx: 96,
      src: "data:image/png;base64,aaa",
    });
    expect(placement).not.toBeNull();
    expect(placement!.draw).toBe(true);
    expect(placement!.x).toBe(0.65);
    expect(placement!.y).toBe(0.65);
    expect(placement!.widthIn).toBeGreaterThan(0);
    expect(placement!.heightIn).toBeLessThanOrEqual(0.55 + 1e-9);
  });

  it("re-exports brand placement for dual-logo certificates", () => {
    const bytes = transparentPngBytes();
    const logo = {
      bytes,
      extension: "png" as const,
      widthPx: 240,
      heightPx: 96,
      src: "data:image/png;base64,aaa",
    };
    const withPlatform = certificateBrandLogoPlacement(logo, {
      withPlatformMark: true,
    });
    expect(withPlatform!.x).toBeGreaterThan(5);
  });
});
