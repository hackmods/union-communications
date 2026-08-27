import { describe, expect, it } from "vitest";
import { graphicLayoutChrome } from "@/lib/comms/graphic-layout-chrome";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";

describe("graphicLayoutChrome", () => {
  const tokens = resolveCanvasTokens(DEFAULT_BRAND_KIT);

  it("keeps preview title at full token size (no double-shrink)", () => {
    const preview = graphicLayoutChrome(tokens, false);
    expect(preview.titlePx).toBe(tokens.titleFontSizePx);
    expect(preview.bodyPx).toBe(tokens.subtitleFontSizePx);
    // Guard against regressing to the 0.72× preview factor that made
    // column-width Graphic Maker previews look empty.
    expect(preview.titlePx).toBeGreaterThan(
      Math.round(tokens.titleFontSizePx * 0.72),
    );
  });

  it("slightly boosts export title vs tokens", () => {
    const exported = graphicLayoutChrome(tokens, true);
    expect(exported.titlePx).toBe(Math.round(tokens.titleFontSizePx * 1.05));
    expect(exported.bodyPx).toBe(Math.round(tokens.subtitleFontSizePx * 1.25));
    expect(exported.pad).toBe(tokens.paddingPx);
  });

  it("uses modest preview pad without collapsing type", () => {
    const preview = graphicLayoutChrome(tokens, false);
    expect(preview.pad).toBe(Math.round(tokens.paddingPx * 0.7));
    expect(preview.pad).toBeGreaterThanOrEqual(
      Math.round(tokens.paddingPx * 0.55),
    );
  });

  it("returns pad-only chrome when tokens are omitted", () => {
    expect(graphicLayoutChrome(undefined, false)).toEqual({ pad: 16 });
    expect(graphicLayoutChrome(undefined, true)).toEqual({ pad: 32 });
  });
});
