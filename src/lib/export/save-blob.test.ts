import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveAs = vi.fn();

vi.mock("file-saver", () => ({
  saveAs: (...args: unknown[]) => saveAs(...args),
}));

import {
  downloadHrefAsFile,
  isIosWebKit,
  isStandaloneDisplay,
  mimeFromFilename,
  saveBlob,
  withFilenameMime,
} from "./save-blob";

describe("mimeFromFilename", () => {
  it("maps png and pdf extensions", () => {
    expect(mimeFromFilename("board-notice-letter.png")).toBe("image/png");
    expect(mimeFromFilename("notice.pdf")).toBe("application/pdf");
  });
});

describe("withFilenameMime", () => {
  it("re-wraps untyped blobs", () => {
    const raw = new Blob(["x"], { type: "" });
    const typed = withFilenameMime(raw, "out.png");
    expect(typed.type).toBe("image/png");
  });

  it("keeps an explicit type", () => {
    const raw = new Blob(["x"], { type: "image/png" });
    expect(withFilenameMime(raw, "out.png")).toBe(raw);
  });
});

describe("saveBlob", () => {
  const open = vi.fn(() => ({}) as Window);

  beforeEach(() => {
    saveAs.mockClear();
    open.mockClear();
    vi.stubGlobal("open", open);
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      platform: "Win32",
      maxTouchPoints: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses file-saver on desktop", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    await saveBlob(blob, "test.png");
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0]?.[1]).toBe("test.png");
    expect(open).not.toHaveBeenCalled();
  });

  it("opens inline image tab on iOS when share is unavailable", async () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: false,
    });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    const blob = new Blob(["png"], { type: "image/png" });
    await saveBlob(blob, "notice.png");

    expect(open).toHaveBeenCalledWith("blob:mock", "_blank");
    expect(saveAs).not.toHaveBeenCalled();
  });

  it("skips inline tab in standalone and uses file-saver", async () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: true,
    });
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    const blob = new Blob(["png"], { type: "image/png" });
    await saveBlob(blob, "logo.png");

    expect(open).not.toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0]?.[1]).toBe("logo.png");
  });

  it("prefers Web Share on mobile when supported", async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
      share,
      canShare: () => true,
    });

    const blob = new Blob(["png"], { type: "image/png" });
    await saveBlob(blob, "notice.png");

    expect(share).toHaveBeenCalledTimes(1);
    expect(saveAs).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});

describe("downloadHrefAsFile", () => {
  beforeEach(() => {
    saveAs.mockClear();
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      platform: "Win32",
      maxTouchPoints: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches then saves", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, blob: async () => blob })),
    );

    await downloadHrefAsFile("/assets/logo.png", "logo.png");

    expect(saveAs).toHaveBeenCalledTimes(1);
    expect(saveAs.mock.calls[0]?.[1]).toBe("logo.png");
  });

  it("throws when fetch is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, blob: async () => new Blob() })),
    );

    await expect(
      downloadHrefAsFile("/assets/missing.png", "missing.png"),
    ).rejects.toThrow(/404/);
    expect(saveAs).not.toHaveBeenCalled();
  });
});

describe("isIosWebKit", () => {
  it("detects iPhone user agent", () => {
    vi.stubGlobal("navigator", {
      userAgent: "iPhone",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isIosWebKit()).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe("isStandaloneDisplay", () => {
  it("reads iOS navigator.standalone", () => {
    vi.stubGlobal("navigator", { standalone: true });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(isStandaloneDisplay()).toBe(true);
    vi.unstubAllGlobals();
  });
});
