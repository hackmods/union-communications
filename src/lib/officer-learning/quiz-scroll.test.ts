import { describe, expect, it } from "vitest";
import { scrollQuizIntoView } from "./quiz-scroll";

describe("scrollQuizIntoView", () => {
  it("no-ops when element is null", () => {
    expect(() => scrollQuizIntoView(null)).not.toThrow();
  });
});
