import { describe, expect, it } from "vitest";
import {
  cornerAllowsByline,
  pieceUsesChevrons,
} from "./board-banner-ornaments";

describe("board-banner-ornaments", () => {
  it("never enables chevrons on side pieces", () => {
    expect(pieceUsesChevrons("side", true)).toBe(false);
    expect(pieceUsesChevrons("side", false)).toBe(false);
  });

  it("passes chevron toggle for banner bottom and corner", () => {
    expect(pieceUsesChevrons("banner", true)).toBe(true);
    expect(pieceUsesChevrons("bottom", false)).toBe(false);
    expect(pieceUsesChevrons("corner", true)).toBe(true);
  });

  it("allows corner byline only at 2\" edge or wider", () => {
    expect(cornerAllowsByline(true, 1.5)).toBe(false);
    expect(cornerAllowsByline(true, 2)).toBe(true);
    expect(cornerAllowsByline(false, 2.5)).toBe(false);
  });
});
