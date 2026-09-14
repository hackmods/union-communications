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

  it("keeps supporting meta smaller than body type", () => {
    const preview = graphicLayoutChrome(tokens, false);
    expect(preview.metaPx).toBeLessThanOrEqual(18);
    expect(preview.metaPx!).toBeLessThan(preview.bodyPx!);
  });

  it("returns pad-only chrome when tokens are omitted", () => {
    expect(graphicLayoutChrome(undefined, false)).toEqual({ pad: 16 });
    expect(graphicLayoutChrome(undefined, true)).toEqual({ pad: 32 });
  });

  it("scales title with HD design width so social sheets are not postage-stamp", () => {
    const square = graphicLayoutChrome(tokens, true, 1080);
    const letterish = graphicLayoutChrome(tokens, true);
    expect(square.titlePx!).toBeGreaterThan(letterish.titlePx! * 1.6);
    expect(square.bodyPx!).toBeGreaterThan(letterish.bodyPx!);
    expect(square.metaPx!).toBeLessThanOrEqual(22);
    expect(square.metaPx!).toBeGreaterThanOrEqual(14);
  });

  it("still scales type when Brand Kit tokens are omitted on an HD sheet", () => {
    const hd = graphicLayoutChrome(undefined, true, 1080);
    const legacy = graphicLayoutChrome(undefined, true);
    expect(legacy).toEqual({ pad: 32 });
    expect(hd.titlePx!).toBeGreaterThan(50);
    expect(hd.metaPx!).toBeLessThanOrEqual(22);
    expect(hd.pad).toBeGreaterThan(legacy.pad);
  });
});
