import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Longevity guard: treatment border math must come from design-treatment-surface,
 * not invent px/ratio literals inside maker canvases.
 */
const ROOT = path.resolve(__dirname, "../..");

const WATCH = [
  "components/tools/qr-board/QrBoardCanvas.tsx",
  "components/tools/flyer-layouts.tsx",
  "components/tools/graphic-layouts.tsx",
];

describe("treatment chrome contract", () => {
  it("QrBoard uses the shared frame helper (no local 0.025 ratio)", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "components/tools/qr-board/QrBoardCanvas.tsx"),
      "utf8",
    );
    expect(src).toContain("treatmentQrBoardFrameStyle");
    expect(src).not.toMatch(/designWidth\s*\*\s*0\.025/);
  });

  it("flyer/graphic layouts import the shared surface helper", () => {
    for (const rel of WATCH.slice(1)) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      expect(src).toContain("design-treatment-surface");
    }
  });
});
