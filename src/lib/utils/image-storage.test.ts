import { describe, expect, it, vi, afterEach } from "vitest";
import { downscaleImageForStorage } from "./image-storage";

describe("downscaleImageForStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("passes SVG through as a data URL without canvas", async () => {
    const file = new File(["<svg></svg>"], "mark.svg", {
      type: "image/svg+xml",
    });
    const dataUrl = await downscaleImageForStorage(file);
    expect(dataUrl.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("draws rasters onto a canvas capped at maxEdge", async () => {
    class FakeImage {
      width = 2000;
      height = 1000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }

    const drawImage = vi.fn();
    const toDataURL = vi.fn(() => "data:image/png;base64,abc");
    const getContext = vi.fn(() => ({ drawImage }));
    const canvasEl = {
      width: 0,
      height: 0,
      getContext,
      toDataURL,
    };

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return canvasEl as unknown as HTMLCanvasElement;
      }
      return document.createElementNS("http://www.w3.org/1999/xhtml", tag);
    });

    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:fake",
      revokeObjectURL: vi.fn(),
    });

    const file = new File(["png"], "logo.png", { type: "image/png" });
    const dataUrl = await downscaleImageForStorage(file, { maxEdge: 1024 });

    expect(dataUrl).toBe("data:image/png;base64,abc");
    expect(drawImage).toHaveBeenCalled();
    expect(toDataURL).toHaveBeenCalledWith("image/png", 0.85);
    expect(canvasEl.width).toBe(1024);
    expect(canvasEl.height).toBe(512);
  });
});
