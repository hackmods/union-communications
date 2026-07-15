import { describe, expect, it } from "vitest";
import {
  logoDisplaySizePx,
  resolveBrandLogoBytes,
  transparentPngBytes,
} from "./brand-logo-bytes";
import type { BrandKit } from "@/types/entities";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";

/** 1×1 red PNG */
const RED_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const tinyPngDataUrl = `data:image/png;base64,${RED_PNG_B64}`;

describe("brand-logo-bytes", () => {
  it("returns transparent PNG helper bytes", () => {
    expect(transparentPngBytes().byteLength).toBeGreaterThan(10);
  });

  it("decodes custom data-URL logos", async () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: false,
      customLogoDataUrl: tinyPngDataUrl,
    };
    const logo = await resolveBrandLogoBytes(kit, { includeLogo: true });
    expect(logo).not.toBeNull();
    expect(logo!.extension).toBe("png");
    expect(logo!.bytes.byteLength).toBeGreaterThan(10);
  });

  it("returns null when includeLogo is false", async () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: false,
      customLogoDataUrl: tinyPngDataUrl,
    };
    expect(
      await resolveBrandLogoBytes(kit, { includeLogo: false }),
    ).toBeNull();
  });

  it("caps display size", () => {
    const [w, h] = logoDisplaySizePx({
      bytes: transparentPngBytes(),
      extension: "png",
      widthPx: 400,
      heightPx: 200,
      src: "",
    });
    expect(w).toBeLessThanOrEqual(180);
    expect(h).toBeLessThanOrEqual(72);
  });
});
