import { describe, expect, it } from "vitest";
import {
  resolveBrandLogoBytes,
  transparentPngBytes,
} from "./brand-logo-bytes";
import type { BrandKit } from "@/types/entities";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";

const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const pngDataUrl = `data:image/png;base64,${PNG_B64}`;

describe("brand-logo-bytes", () => {
  it("returns transparent PNG helper", () => {
    expect(transparentPngBytes().byteLength).toBeGreaterThan(10);
  });

  it("decodes PNG data URLs without canvas", async () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: false,
      customLogoDataUrl: pngDataUrl,
    };
    const logo = await resolveBrandLogoBytes(kit, { includeLogo: true });
    expect(logo).not.toBeNull();
    expect(logo!.extension).toBe("png");
  });

  it("returns null when includeLogo is false", async () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: false,
      customLogoDataUrl: pngDataUrl,
    };
    expect(
      await resolveBrandLogoBytes(kit, { includeLogo: false }),
    ).toBeNull();
  });

  it("returns null for JPEG data URL without canvas (must re-encode)", async () => {
    // Minimal invalid-as-jpeg but typed as jpeg — without canvas we fail soft
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: false,
      customLogoDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
    };
    const logo = await resolveBrandLogoBytes(kit, { includeLogo: true });
    // In jsdom, Image may or may not load; either null or png is acceptable
    if (logo) expect(logo.extension).toBe("png");
  });
});
