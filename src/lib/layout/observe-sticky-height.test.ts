/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  observeLiveChromeBottom,
  observeStickyHeight,
} from "./observe-sticky-height";

afterEach(() => {
  document.documentElement.style.removeProperty("--site-header-height");
  document.documentElement.style.removeProperty("--site-header-bottom");
});

function mockRect(
  element: HTMLElement,
  rect: Pick<DOMRect, "height" | "bottom">,
) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: rect.bottom - rect.height,
    width: 390,
    height: rect.height,
    top: rect.bottom - rect.height,
    right: 390,
    bottom: rect.bottom,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

describe("observeStickyHeight", () => {
  it("publishes block height", () => {
    const element = document.createElement("header");
    mockRect(element, { height: 72, bottom: 72 });
    const onMeasure = vi.fn();
    const stop = observeStickyHeight(element, "--site-header-height", onMeasure);
    expect(onMeasure).toHaveBeenCalledWith(72);
    expect(
      document.documentElement.style.getPropertyValue("--site-header-height"),
    ).toBe("72px");
    stop();
  });
});

describe("observeLiveChromeBottom", () => {
  it("publishes the live viewport bottom, not height", () => {
    const element = document.createElement("header");
    mockRect(element, { height: 96, bottom: 640 });
    const onMeasure = vi.fn();
    const stop = observeLiveChromeBottom(
      element,
      "--site-header-bottom",
      onMeasure,
    );
    expect(onMeasure).toHaveBeenCalledWith(640);
    expect(
      document.documentElement.style.getPropertyValue("--site-header-bottom"),
    ).toBe("640px");
    stop();
  });

  it("clamps a scrolled-away header to the top of the viewport", () => {
    const element = document.createElement("header");
    mockRect(element, { height: 96, bottom: -120 });
    const onMeasure = vi.fn();
    const stop = observeLiveChromeBottom(
      element,
      "--site-header-bottom",
      onMeasure,
    );
    expect(onMeasure).toHaveBeenCalledWith(0);
    expect(
      document.documentElement.style.getPropertyValue("--site-header-bottom"),
    ).toBe("0px");
    stop();
  });
});
