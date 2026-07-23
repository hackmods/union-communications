import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveAs = vi.fn();
const toBlob = vi.fn();
const toPng = vi.fn();
const toSvg = vi.fn();

vi.mock("file-saver", () => ({
  saveAs: (...args: unknown[]) => saveAs(...args),
}));

vi.mock("html-to-image", () => ({
  toBlob: (...args: unknown[]) => toBlob(...args),
  toPng: (...args: unknown[]) => toPng(...args),
  toSvg: (...args: unknown[]) => toSvg(...args),
}));

import { dataUrlToBlob, exportNodeAsBlob, exportNodeAsPng } from "./image-export";

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

describe("exportNodeAsPng (dynamic html-to-image)", () => {
  beforeEach(() => {
    saveAs.mockClear();
    toBlob.mockReset();
    toPng.mockReset();
    toSvg.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("downloads via toBlob when capture succeeds", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    toBlob.mockResolvedValue(blob);
    const node = { offsetWidth: 40, offsetHeight: 20 } as HTMLElement;

    await exportNodeAsPng(node, "canvas.png", { backgroundColor: "#ffffff" });

    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(toPng).not.toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalledWith(blob, "canvas.png");
  });

  it("falls back to toPng when toBlob returns null", async () => {
    toBlob.mockResolvedValue(null);
    toPng.mockResolvedValue(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    );
    const node = { offsetWidth: 10, offsetHeight: 10 } as HTMLElement;

    await exportNodeAsPng(node, "fallback.png");

    expect(toPng).toHaveBeenCalledTimes(1);
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0][1]).toBe("fallback.png");
  });
});

describe("exportNodeAsBlob (dynamic html-to-image)", () => {
  beforeEach(() => {
    toBlob.mockReset();
    toPng.mockReset();
  });

  it("returns the blob from toBlob when non-empty", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    toBlob.mockResolvedValue(blob);
    const node = { offsetWidth: 8, offsetHeight: 8 } as HTMLElement;

    await expect(exportNodeAsBlob(node)).resolves.toBe(blob);
    expect(toPng).not.toHaveBeenCalled();
  });
});
