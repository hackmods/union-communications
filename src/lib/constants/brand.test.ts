import { describe, expect, it } from "vitest";
import { ASSET_PACK_COLORS, BRAND_COLORS } from "@/lib/constants/brand";

describe("ASSET_PACK_COLORS", () => {
  it("mirrors reference tenant brandDefaults (OPSEU blue), not host chrome", () => {
    expect(ASSET_PACK_COLORS.primary).toBe("#003DA5");
    expect(ASSET_PACK_COLORS.accent).toBe("#002868");
    expect(ASSET_PACK_COLORS.secondary).toBe("#FFFFFF");
    expect(ASSET_PACK_COLORS.black).toBe("#1A1A1A");
  });

  it("stays distinct from platform host BRAND_COLORS when host is UnionOps orange", () => {
    // Default config/host-brand.json uses platform orange; asset pack does not.
    expect(BRAND_COLORS.primary).toBe("#C2410C");
    expect(ASSET_PACK_COLORS.primary).not.toBe(BRAND_COLORS.primary);
  });
});
