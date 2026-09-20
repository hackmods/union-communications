import { describe, expect, it } from "vitest";
import { ASSET_PACK_COLORS, BRAND_COLORS } from "@/lib/constants/brand";

describe("ASSET_PACK_COLORS", () => {
  it("mirrors reference tenant brandDefaults (B7P), not host chrome", () => {
    // Static seed #1 is Behind 7 Proxies — workshop orange, not OPSEU blue.
    expect(ASSET_PACK_COLORS.primary).toBe("#E87722");
    expect(ASSET_PACK_COLORS.accent).toBe("#1A1A1A");
    expect(ASSET_PACK_COLORS.secondary).toBe("#FFFFFF");
    expect(ASSET_PACK_COLORS.black).toBe("#1A1A1A");
  });

  it("stays distinct from platform host BRAND_COLORS when host is UnionOps burnt orange", () => {
    // Default config/host-brand.json uses platform burnt orange (#C2410C);
    // B7P workshop orange (#E87722) is a different swatch.
    expect(BRAND_COLORS.primary).toBe("#C2410C");
    expect(ASSET_PACK_COLORS.primary).not.toBe(BRAND_COLORS.primary);
  });
});
