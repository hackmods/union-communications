import { describe, expect, it } from "vitest";
import {
  LETTER_CONTEXT_PRESETS,
  consumeLetterHandoff,
  isLetterContextId,
  letterGeneratorContextHref,
  saveLetterHandoff,
} from "./letter-contexts";
import { LETTER_PRESET_IDS } from "./document-generator-draft";

describe("letter contexts", () => {
  it("maps every context to a letter preset", () => {
    for (const [context, preset] of Object.entries(LETTER_CONTEXT_PRESETS)) {
      expect(isLetterContextId(context)).toBe(true);
      expect(LETTER_PRESET_IDS).toContain(preset);
    }
  });

  it("builds Letter Generator deep links with optional source", () => {
    expect(letterGeneratorContextHref("accommodation")).toContain(
      "preset=accommodation-letter",
    );
    expect(letterGeneratorContextHref("grievance", { from: "rtw" })).toContain(
      "from=rtw",
    );
  });

  it("round-trips an in-memory handoff", () => {
    expect(
      saveLetterHandoff({
        context: "accommodation",
        source: "rtw-accommodation",
        fields: { body: "Hello HR", memberName: "Alex" },
      }),
    ).toBe(true);
    expect(consumeLetterHandoff()).toEqual({
      context: "accommodation",
      source: "rtw-accommodation",
      fields: { body: "Hello HR", memberName: "Alex" },
    });
    expect(consumeLetterHandoff()).toBeNull();
  });
});
