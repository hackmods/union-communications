import { describe, expect, it } from "vitest";
import { cornerAllowsByline } from "./board-banner-ornaments";

describe("board-banner-ornaments", () => {
  it("allows corner byline only at 2\" edge or wider", () => {
    expect(cornerAllowsByline(true, 1.5)).toBe(false);
    expect(cornerAllowsByline(true, 2)).toBe(true);
    expect(cornerAllowsByline(false, 2.5)).toBe(false);
  });
});
