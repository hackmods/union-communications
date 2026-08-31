import { describe, expect, it } from "vitest";
import { bylawDraftStorageKey, createBylawDraftStorage } from "./draft";

describe("bylaw draft storage", () => {
  it("uses a global key when no circle is set", () => {
    expect(bylawDraftStorageKey()).toBe("unionops.bylaw-builder.draft.v2");
  });

  it("scopes storage per portal circle", () => {
    expect(bylawDraftStorageKey("circle-lec-243")).toBe(
      "unionops.bylaw-builder.draft.v2.circle.circle-lec-243",
    );
  });

  it("creates independent storage helpers per circle", () => {
    const global = createBylawDraftStorage();
    const circle = createBylawDraftStorage("circle-lec-243");
    expect(global.load).not.toBe(circle.load);
  });
});
