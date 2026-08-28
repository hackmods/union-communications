import { describe, expect, it, vi, afterEach } from "vitest";
import { focusQuizStart, scrollQuizIntoView } from "./quiz-scroll";

describe("scrollQuizIntoView", () => {
  it("no-ops when element is null", () => {
    expect(() => scrollQuizIntoView(null)).not.toThrow();
  });
});

describe("focusQuizStart", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("no-ops when container is null", () => {
    expect(() => focusQuizStart(null)).not.toThrow();
  });
});
