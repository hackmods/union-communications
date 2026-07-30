import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveAs = vi.fn();

vi.mock("file-saver", () => ({
  saveAs: (...args: unknown[]) => saveAs(...args),
}));

import {
  isIosWebKit,
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
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });

    const blob = new Blob(["png"], { type: "image/png" });
    await saveBlob(blob, "notice.png");

    expect(open).toHaveBeenCalledWith("blob:mock", "_blank");
    expect(saveAs).not.toHaveBeenCalled();
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
