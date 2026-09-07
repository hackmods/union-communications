import { describe, expect, it } from "vitest";
import {
  CANVAS_ASPECTS,
  CANVAS_ASPECT_ORDER,
  canvasAspectDesignHeight,
  exampleAspectDesignSize,
} from "./canvas-aspects";

describe("canvas-aspects", () => {
  it("registers A4 and social ratios before UI wiring", () => {
    expect(CANVAS_ASPECTS.a4.widthInches).toBeCloseTo(210 / 25.4, 3);
    expect(CANVAS_ASPECTS["1:1"].aspectClass).toBe("aspect-square");
    expect(CANVAS_ASPECTS["4:5"].aspectRatio).toBe("4 / 5");
    expect(CANVAS_ASPECTS["16:9"].designWidthPx).toBe(1920);
    expect(CANVAS_ASPECT_ORDER).toContain("a4");
  });

  it("derives design height from aspect", () => {
    expect(canvasAspectDesignHeight(CANVAS_ASPECTS.letter)).toBe(1100);
    expect(canvasAspectDesignHeight(CANVAS_ASPECTS["1:1"])).toBe(1080);
  });

  it("maps ExampleAspect to design sizes", () => {
    expect(exampleAspectDesignSize("square")).toEqual({
      width: 1080,
      height: 1080,
    });
    expect(exampleAspectDesignSize("portrait")).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(exampleAspectDesignSize("landscape")).toEqual({
      width: 1920,
      height: 1080,
    });
  });
});
