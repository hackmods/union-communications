import { describe, expect, it } from "vitest";
import { boardUrlFontSizePx, formatCanvasDisplayUrl } from "./canvas-url";

describe("formatCanvasDisplayUrl", () => {
  it("strips https and www for readable captions", () => {
    expect(
      formatCanvasDisplayUrl(
        "https://www.ontario.ca/document/guide-occupational-health-and-safety-act",
      ),
    ).toBe("ontario.ca/document/guide-occupational-health-and-safety-act");
  });

  it("keeps host-only destinations", () => {
    expect(formatCanvasDisplayUrl("https://example.com/")).toBe("example.com");
    expect(formatCanvasDisplayUrl("http://localhost:3000")).toBe(
      "localhost:3000",
    );
  });

  it("preserves query strings for typing", () => {
    expect(formatCanvasDisplayUrl("https://example.com/join?ref=board")).toBe(
      "example.com/join?ref=board",
    );
  });

  it("leaves non-http schemes alone", () => {
    expect(formatCanvasDisplayUrl("mailto:steward@example.com")).toBe(
      "mailto:steward@example.com",
    );
  });

  it("shortens long paths when maxChars is set", () => {
    const out = formatCanvasDisplayUrl(
      "https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees",
      { maxChars: 32 },
    );
    expect(out.length).toBeLessThanOrEqual(32);
    expect(out).toContain("…");
    expect(out).toContain("ontario.ca");
  });
});

describe("boardUrlFontSizePx", () => {
  it("stays readable on dense letter boards", () => {
    expect(
      boardUrlFontSizePx({ isTabloid: false, isDense: true }),
    ).toBeGreaterThanOrEqual(9);
  });

  it("grows for tabloid and caps display type scale", () => {
    const letter = boardUrlFontSizePx({ isTabloid: false, isDense: false });
    const tabloid = boardUrlFontSizePx({ isTabloid: true, isDense: false });
    const display = boardUrlFontSizePx({
      isTabloid: true,
      isDense: false,
      typeScale: 1.1,
    });
    expect(tabloid).toBeGreaterThan(letter);
    expect(display).toBe(tabloid);
  });
});
