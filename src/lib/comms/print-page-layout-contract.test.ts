import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * Print layouts must use resolvePrintPageLayout (or capped printPageScaledTokens)
 * — never hand-tune `subtitleFontSizePx + N` after denser letter canvases.
 */
describe("print page layout engine contracts", () => {
  it("flyer and board-notice use resolvePrintPageLayout, not subtitle+N meta", () => {
    const flyer = fs.readFileSync(
      path.join(ROOT, "src/components/tools/flyer-layouts.tsx"),
      "utf8",
    );
    const notice = fs.readFileSync(
      path.join(ROOT, "src/components/tools/board-notice-layouts.tsx"),
      "utf8",
    );
    expect(flyer).toMatch(/resolvePrintPageLayout/);
    expect(notice).toMatch(/resolvePrintPageLayout/);
    expect(flyer).not.toMatch(/subtitleFontSizePx\s*\+\s*\d/);
    expect(notice).not.toMatch(/subtitleFontSizePx\s*\+\s*\d/);
  });
});
