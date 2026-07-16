import { describe, expect, it } from "vitest";
import { INK_BLACK, INK_WHITE } from "@/lib/utils/ink";
import {
  buildAdaptiveFaviconSvg,
  buildUnionOpsMarkSvg,
  resolveUnionOpsMarkPaint,
} from "@/lib/brand/unionops-mark-svg";

describe("resolveUnionOpsMarkPaint", () => {
  it("uses primary plate and contrasting white glyph on brand orange", () => {
    expect(resolveUnionOpsMarkPaint("#C2410C")).toEqual({
      plate: "#C2410C",
      glyph: INK_WHITE,
    });
  });

  it("uses primary plate and contrasting black glyph on pale primaries", () => {
    expect(resolveUnionOpsMarkPaint("#F5E6D3")).toEqual({
      plate: "#F5E6D3",
      glyph: INK_BLACK,
    });
  });

  it("mirrors UnionOpsMark light ink (on dark)", () => {
    expect(resolveUnionOpsMarkPaint("#C2410C", INK_WHITE)).toEqual({
      plate: INK_WHITE,
      glyph: "#C2410C",
    });
  });

  it("mirrors UnionOpsMark dark ink (on pale)", () => {
    expect(resolveUnionOpsMarkPaint("#F5E6D3", INK_BLACK)).toEqual({
      plate: INK_BLACK,
      glyph: INK_WHITE,
    });
  });
});

describe("buildUnionOpsMarkSvg", () => {
  it("embeds brand primary and white glyph for platform orange", () => {
    const svg = buildUnionOpsMarkSvg({ primary: "#C2410C" });
    expect(svg).toContain('fill="#C2410C"');
    expect(svg).toContain(`stroke="${INK_WHITE}"`);
  });

  it("embeds black glyph for pale primary", () => {
    const svg = buildUnionOpsMarkSvg({ primary: "#F5E6D3" });
    expect(svg).toContain('fill="#F5E6D3"');
    expect(svg).toContain(`stroke="${INK_BLACK}"`);
  });
});

describe("buildAdaptiveFaviconSvg", () => {
  it("includes prefers-color-scheme dark overrides", () => {
    const svg = buildAdaptiveFaviconSvg({ primary: "#C2410C" });
    expect(svg).toContain("prefers-color-scheme: dark");
    expect(svg).toContain(`fill: #C2410C`);
    expect(svg).toContain(`stroke: ${INK_WHITE}`);
    // Dark chrome → white plate + primary glyph
    expect(svg).toContain(`fill: ${INK_WHITE}`);
    expect(svg).toContain(`stroke: #C2410C`);
  });

  it("dark scheme uses black plate when light-mode glyph is black", () => {
    const svg = buildAdaptiveFaviconSvg({ primary: "#F5E6D3" });
    expect(svg).toContain(`stroke: ${INK_BLACK}`);
    expect(svg).toContain(`fill: ${INK_BLACK}`);
    expect(svg).toContain(`stroke: ${INK_WHITE}`);
  });
});
