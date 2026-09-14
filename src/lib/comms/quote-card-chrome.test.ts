import { describe, expect, it } from "vitest";
import { quoteIdentityChrome } from "./quote-card-chrome";

describe("quoteIdentityChrome", () => {
  it("sizes local type above the print meta cap on a square sheet", () => {
    const square = quoteIdentityChrome(1080, 1080);
    expect(square.localPx).toBeGreaterThan(22);
    expect(square.localPx).toBeLessThanOrEqual(34);
    expect(square.logoMaxHeightPx).toBeGreaterThan(150);
  });

  it("keeps portrait lockup on the short side so the quote still leads", () => {
    const portrait = quoteIdentityChrome(1080, 1920);
    const square = quoteIdentityChrome(1080, 1080);
    expect(portrait.logoMaxHeightPx).toBe(square.logoMaxHeightPx);
    expect(portrait.localPx).toBe(square.localPx);
  });
});
