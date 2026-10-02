/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { lockBodyScroll } from "./lock-body-scroll";

afterEach(() => {
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
  vi.unstubAllGlobals();
});

describe("lockBodyScroll", () => {
  it("locks html and body overflow without position fixed", () => {
    const unlock = lockBodyScroll();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).not.toBe("fixed");
    unlock();
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
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
