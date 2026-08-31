import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearJsonDraft, loadJsonDraft, saveJsonDraft } from "./storage";

const KEY = "unionops.test.draft";

function isCountDraft(v: unknown): v is { count: number } {
  return !!v && typeof v === "object" && typeof (v as { count?: unknown }).count === "number";
}

describe("steward-guides JSON draft storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("round-trips a validator-approved draft", () => {
    expect(saveJsonDraft(KEY, { count: 3 })).toBe(true);
    expect(loadJsonDraft(KEY, isCountDraft)).toEqual({ count: 3 });
  });

  it("returns null for missing, corrupt, or schema-invalid values", () => {
    expect(loadJsonDraft(KEY, isCountDraft)).toBeNull();

    window.localStorage.setItem(KEY, "{not-json");
    expect(loadJsonDraft(KEY, isCountDraft)).toBeNull();

    window.localStorage.setItem(KEY, JSON.stringify({ count: "three" }));
    expect(loadJsonDraft(KEY, isCountDraft)).toBeNull();
  });

  it("returns false when localStorage throws (private mode / quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(saveJsonDraft(KEY, { count: 1 })).toBe(false);

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    expect(clearJsonDraft(KEY)).toBe(false);
  });

  it("clears a stored draft", () => {
    expect(saveJsonDraft(KEY, { count: 1 })).toBe(true);
    expect(clearJsonDraft(KEY)).toBe(true);
    expect(loadJsonDraft(KEY, isCountDraft)).toBeNull();
  });
});
