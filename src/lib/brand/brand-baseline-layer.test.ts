import { describe, expect, it } from "vitest";
import { buildBrandBaselineLayerFromTheme } from "@/lib/brand/brand-baseline-layer";

describe("buildBrandBaselineLayerFromTheme", () => {
  const theme = {
    primaryColor: "#112233",
    secondaryColor: "#445566",
    accentColor: "#778899",
    headlineFontId: "montserrat" as const,
    bodyFontId: "sourceSans" as const,
  };

  it("defaults logoAssetId to null when omitted", () => {
    const layer = buildBrandBaselineLayerFromTheme({
      scopeId: "union-demo",
      unionName: "Demo",
      theme,
    });
    expect(layer.resource.payload.logoAssetId).toBeNull();
    expect(layer.resource.payload.primaryColor).toBe("#112233");
  });

  it("wires an uploaded logo asset id into the baseline payload", () => {
    const layer = buildBrandBaselineLayerFromTheme({
      scopeId: "union-demo",
      unionName: "Demo",
      theme,
      logoAssetId: "asset-1234567890-abc",
    });
    expect(layer.resource.payload.logoAssetId).toBe("asset-1234567890-abc");
  });

  it("allows clearing the logo with null", () => {
    const layer = buildBrandBaselineLayerFromTheme({
      scopeId: "union-demo",
      unionName: "Demo",
      theme,
      logoAssetId: null,
    });
    expect(layer.resource.payload.logoAssetId).toBeNull();
  });
});
