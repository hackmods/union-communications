import { afterEach, describe, expect, it, vi } from "vitest";
import { composeDuotonePhotoDataUrl } from "./duotone-photo";

describe("composeDuotonePhotoDataUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the original URL when photoUrl is empty", async () => {
    await expect(
      composeDuotonePhotoDataUrl("", "#003DA5", "#FFFFFF", 0.7),
    ).resolves.toBe("");
  });

  it("composites grayscale + multiply + screen onto a canvas", async () => {
    class FakeImage {
      width = 64;
      height = 48;
      naturalWidth = 64;
      naturalHeight = 48;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }

    const drawImage = vi.fn();
    const fillRect = vi.fn();
    const toDataURL = vi.fn(() => "data:image/jpeg;base64,baked");
    const ctx = {
      filter: "none",
      globalCompositeOperation: "source-over",
      globalAlpha: 1,
      fillStyle: "",
      drawImage,
      fillRect,
    };
    const canvasEl = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toDataURL,
    };

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return canvasEl as unknown as HTMLCanvasElement;
      }
      return document.createElementNS("http://www.w3.org/1999/xhtml", tag);
    });
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);

    const out = await composeDuotonePhotoDataUrl(
      "data:image/png;base64,abc",
      "#003DA5",
      "#F5A623",
      0.7,
    );

    expect(out).toBe("data:image/jpeg;base64,baked");
    expect(drawImage).toHaveBeenCalled();
    expect(fillRect).toHaveBeenCalledTimes(2);
    expect(toDataURL).toHaveBeenCalledWith("image/jpeg", 0.92);
    expect(ctx.filter === "none" || ctx.filter === "").toBe(true);
  });

  it("falls back to the source URL when canvas context is missing", async () => {
    class FakeImage {
      width = 10;
      height = 10;
      naturalWidth = 10;
      naturalHeight = 10;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => null,
          toDataURL: vi.fn(),
        } as unknown as HTMLCanvasElement;
      }
      return document.createElementNS("http://www.w3.org/1999/xhtml", tag);
    });
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);

    const src = "data:image/png;base64,fallback";
    await expect(
      composeDuotonePhotoDataUrl(src, "#000", "#fff", 0.5),
    ).resolves.toBe(src);
  });
});
