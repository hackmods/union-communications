import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveAs = vi.fn();
const addImage = vi.fn();
const addPage = vi.fn();
const output = vi.fn(() => new Blob(["pdf"], { type: "application/pdf" }));
const JsPDFCtor = vi.fn();

const toPng = vi.fn(
  async (..._args: [HTMLElement?, Record<string, unknown>?]) =>
    "data:image/png;base64,abc",
);

vi.mock("file-saver", () => ({
  saveAs: (...args: unknown[]) => {
    saveAs(...(args as Parameters<typeof saveAs>));
  },
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    addImage = addImage;
    addPage = addPage;
    output = output;
    constructor(opts?: unknown) {
      JsPDFCtor(opts);
    }
  },
}));

vi.mock("html-to-image", () => ({
  toPng: (node: HTMLElement, opts?: Record<string, unknown>) =>
    toPng(node, opts),
}));

import { exportFlyerPdf, nodeToPdf, nodesToPdf } from "./pdf-export";

function fakeNode(width = 100, height = 200): HTMLElement {
  return {
    offsetWidth: width,
    offsetHeight: height,
  } as HTMLElement;
}

describe("pdf-export", () => {
  beforeEach(() => {
    saveAs.mockClear();
    addImage.mockClear();
    addPage.mockClear();
    output.mockClear();
    JsPDFCtor.mockClear();
    toPng.mockClear();
    toPng.mockResolvedValue("data:image/png;base64,abc");
    vi.stubGlobal("getComputedStyle", () => ({
      backgroundColor: "rgba(0, 0, 0, 0)",
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exportFlyerPdf builds a single-page PDF and downloads it", async () => {
    await exportFlyerPdf("data:image/png;base64,abc", "flyer.pdf", 8.5, 11);

    expect(JsPDFCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        orientation: "portrait",
        unit: "in",
        format: [8.5, 11],
      }),
    );
    expect(addImage).toHaveBeenCalledWith(
      "data:image/png;base64,abc",
      "PNG",
      0,
      0,
      8.5,
      11,
    );
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0]?.[1]).toBe("flyer.pdf");
  });

  it("nodeToPdf captures the node then writes a PDF", async () => {
    await nodeToPdf(fakeNode(), "page.pdf", 8.5, 11, 2, "#ffffff");

    expect(toPng).toHaveBeenCalledTimes(1);
    expect(toPng.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        pixelRatio: 2,
        cacheBust: true,
        width: 100,
        height: 200,
        backgroundColor: "#ffffff",
      }),
    );
    expect(JsPDFCtor).toHaveBeenCalledTimes(1);
    expect(saveAs).toHaveBeenCalledTimes(1);
  });

  it("nodesToPdf no-ops on an empty list", async () => {
    await nodesToPdf([], "empty.pdf");
    expect(toPng).not.toHaveBeenCalled();
    expect(JsPDFCtor).not.toHaveBeenCalled();
    expect(saveAs).not.toHaveBeenCalled();
  });

  it("nodesToPdf paginates when given multiple nodes", async () => {
    await nodesToPdf(
      [fakeNode(80, 100), fakeNode(80, 100), fakeNode(80, 100)],
      "multi.pdf",
      8.5,
      11,
      2,
      "#ffffff",
    );

    expect(toPng).toHaveBeenCalledTimes(3);
    expect(JsPDFCtor).toHaveBeenCalledTimes(1);
    expect(addPage).toHaveBeenCalledTimes(2);
    expect(addImage).toHaveBeenCalledTimes(3);
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0]?.[1]).toBe("multi.pdf");
  });

  it("nodesToPdf with one node delegates to the single-page path", async () => {
    await nodesToPdf([fakeNode()], "one.pdf");

    expect(toPng).toHaveBeenCalledTimes(1);
    expect(addPage).not.toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalledTimes(1);
  });
});
