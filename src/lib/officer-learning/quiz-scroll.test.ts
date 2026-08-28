import { afterEach, describe, expect, it, vi } from "vitest";
import { focusQuizStart, scrollQuizIntoView } from "./quiz-scroll";

describe("scrollQuizIntoView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no-ops when element is null", () => {
    expect(() => scrollQuizIntoView(null)).not.toThrow();
  });

  it("uses instant scrolling when the reader prefers reduced motion", () => {
    const scrollIntoView = vi.fn();
    const element = { scrollIntoView } as unknown as HTMLElement;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true }),
    );

    scrollQuizIntoView(element);

    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "instant",
      block: "start",
    });
  });

  it("uses smooth scrolling when reduced motion is off", () => {
    const scrollIntoView = vi.fn();
    const element = { scrollIntoView } as unknown as HTMLElement;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false }),
    );

    scrollQuizIntoView(element);

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });
});

describe("focusQuizStart", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no-ops when container is null", () => {
    expect(() => focusQuizStart(null)).not.toThrow();
  });

  it("focuses the first radio without scrolling the page again", () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const focus = vi.fn();
    const radio = { focus } as unknown as HTMLInputElement;
    const container = {
      querySelector: vi.fn().mockReturnValue(radio),
    } as unknown as HTMLElement;

    focusQuizStart(container);

    expect(container.querySelector).toHaveBeenCalledWith(
      'input[type="radio"]',
    );
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
