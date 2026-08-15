import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildHtmlToImageOptions,
  findScaledTransformAncestor,
  resolveCaptureBackground,
  withUnscaledAncestors,
} from "./capture";

describe("resolveCaptureBackground", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("honours an explicit background", () => {
    const node = document.createElement("div");
    expect(resolveCaptureBackground(node, "#C2410C")).toBe("#C2410C");
  });

  it("returns undefined for transparent PNG requests", () => {
    const node = document.createElement("div");
    expect(resolveCaptureBackground(node, null)).toBeUndefined();
  });

  it("falls back to white when computed background is transparent", () => {
    vi.stubGlobal("getComputedStyle", () => ({
      backgroundColor: "rgba(0, 0, 0, 0)",
    }));
    const node = document.createElement("div");
    expect(resolveCaptureBackground(node)).toBe("#ffffff");
  });
});

describe("findScaledTransformAncestor / withUnscaledAncestors", () => {
  it("finds an ancestor with an inline scale transform", () => {
    const outer = document.createElement("div");
    const scaled = document.createElement("div");
    scaled.style.transform = "scale(0.4)";
    const inner = document.createElement("div");
    scaled.appendChild(inner);
    outer.appendChild(scaled);
    document.body.appendChild(outer);

    expect(findScaledTransformAncestor(inner)).toBe(scaled);
    outer.remove();
  });

  it("clears scale during the run and restores afterward", async () => {
    const scaled = document.createElement("div");
    scaled.style.transform = "scale(0.5)";
    const inner = document.createElement("div");
    scaled.appendChild(inner);
    document.body.appendChild(scaled);

    let seen = "";
    await withUnscaledAncestors(inner, async () => {
      seen = scaled.style.transform;
    });

    expect(seen).toBe("none");
    expect(scaled.style.transform).toBe("scale(0.5)");
    scaled.remove();
  });
});

describe("buildHtmlToImageOptions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pins width/height, background, and an onclone hook", () => {
    vi.stubGlobal("getComputedStyle", () => ({
      backgroundColor: "#C2410C",
    }));
    const node = document.createElement("div");
    Object.defineProperty(node, "offsetWidth", { value: 320 });
    Object.defineProperty(node, "offsetHeight", { value: 480 });

    const opts = buildHtmlToImageOptions(node, {
      pixelRatio: 2,
      backgroundColor: "#C2410C",
    });

    expect(opts).toEqual(
      expect.objectContaining({
        pixelRatio: 2,
        cacheBust: true,
        width: 320,
        height: 480,
        backgroundColor: "#C2410C",
      }),
    );
    expect(opts.style).toEqual(
      expect.objectContaining({
        transform: "none",
        width: "320px",
        height: "480px",
      }),
    );
    expect(typeof opts.onclone).toBe("function");
  });
});
