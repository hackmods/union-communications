import { describe, expect, it } from "vitest";
import {
  BrandLogoResolveError,
  requireBrandLogoBytes,
  resolveBrandLogoBytes,
  resolveConfiguredBrandLogoBytes,
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
    expect(await resolveBrandLogoBytes(kit, { includeLogo: false })).toBeNull();
  });

  it("returns null for JPEG data URL without canvas (must re-encode)", async () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: false,
      customLogoDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
    };
    const logo = await resolveBrandLogoBytes(kit, { includeLogo: true });
    if (logo) expect(logo.extension).toBe("png");
  });

  it("requireBrandLogoBytes returns logo when present", async () => {
    const kit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      useOfficialLogo: false,
      customLogoDataUrl: pngDataUrl,
    };
    const logo = await requireBrandLogoBytes(kit, { includeLogo: true });
    expect(logo.extension).toBe("png");
  });

  it("requireBrandLogoBytes throws when includeLogo is false", async () => {
    await expect(
      requireBrandLogoBytes(DEFAULT_BRAND_KIT, { includeLogo: false }),
    ).rejects.toBeInstanceOf(BrandLogoResolveError);
  });

  it("loads root-relative public PNG from disk in Node", async () => {
    const logo = await resolveBrandLogoBytes(DEFAULT_BRAND_KIT, { includeLogo: true });
    expect(logo).not.toBeNull();
    expect(logo!.extension).toBe("png");
    expect(logo!.bytes.byteLength).toBeGreaterThan(100);
  });

  it("resolveConfiguredBrandLogoBytes returns null when includeLogo is false", async () => {
    expect(
      await resolveConfiguredBrandLogoBytes(DEFAULT_BRAND_KIT, { includeLogo: false }),
    ).toBeNull();
  });

  it("resolveConfiguredBrandLogoBytes resolves DEFAULT Brand Kit from disk", async () => {
    const logo = await resolveConfiguredBrandLogoBytes(DEFAULT_BRAND_KIT, { includeLogo: true });
    expect(logo).not.toBeNull();
    expect(logo!.bytes.byteLength).toBeGreaterThan(100);
  });
});
