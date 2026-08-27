import { describe, expect, it } from "vitest";
import { resetQuizState } from "./quiz-state";

describe("resetQuizState", () => {
  it("clears answers and submitted flag", () => {
    expect(resetQuizState()).toEqual({ answers: {}, submitted: false });
  });
});
