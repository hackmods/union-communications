import { describe, expect, it } from "vitest";
import { dataUrlToBlob } from "./image-export";

describe("dataUrlToBlob", () => {
  it("decodes a base64 PNG data URL without fetch", async () => {
    // 1×1 transparent PNG
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const blob = dataUrlToBlob(dataUrl);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("decodes a URL-encoded SVG data URL", () => {
    const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const blob = dataUrlToBlob(`data:image/svg+xml,${svg}`);
    expect(blob.type).toBe("image/svg+xml");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("rejects empty canvas data URLs", () => {
    expect(() => dataUrlToBlob("data:,")).toThrow(/empty image/);
  });
});
