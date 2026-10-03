/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lockBodyScroll } from "./lock-body-scroll";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  document.documentElement.style.overflow = "";
  document.documentElement.style.overscrollBehavior = "";
  document.documentElement.classList.remove("nav-sheet-open");
  document.body.style.overflow = "";
  document.body.style.overscrollBehavior = "";
  document.body.style.paddingRight = "";
  vi.unstubAllGlobals();
});

describe("lockBodyScroll", () => {
  it("locks the document scroller without making body a scroll container", () => {
    const unlock = lockBodyScroll();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.documentElement.classList.contains("nav-sheet-open")).toBe(
      true,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.body.style.position).not.toBe("fixed");
    unlock();
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.documentElement.classList.contains("nav-sheet-open")).toBe(
      false,
    );
  });

  it("restores prior scroll position on unlock", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 240 });
    const unlock = lockBodyScroll();
    unlock();
    expect(scrollTo).toHaveBeenCalledWith(0, 240);
  });
});
