import { describe, expect, it } from "vitest";
import { canvasLogoImageFitStyle } from "./canvas-logo-fit";

describe("canvasLogoImageFitStyle", () => {
  it("caps height on the image and lets width follow aspect (no clip box)", () => {
    const style = canvasLogoImageFitStyle(85);
    expect(style.maxHeight).toBe(85);
    expect(style.width).toBe("auto");
    expect(style.height).toBe("auto");
    expect(style.maxWidth).toBe("100%");
    expect(style.objectFit).toBe("contain");
  });
});
